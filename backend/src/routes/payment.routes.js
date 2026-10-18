const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CHAPA_BASE = 'https://api.chapa.co/v1';
const SECRET = process.env.CHAPA_SECRET_KEY;
const PUBLIC_URL = process.env.PUBLIC_API_URL;

const chapaHeaders = {
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize Ethiopian phone numbers to the 10-digit format Chapa expects
 * (09xxxxxxxx or 07xxxxxxxx). Returns undefined if it can't be normalized,
 * so we simply omit the field instead of sending an invalid value.
 */
function normalizePhone(phone) {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, '');

  // 2519xxxxxxxx → 09xxxxxxxx
  if (digits.startsWith('251') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  // 9xxxxxxxx → 09xxxxxxxx
  if (digits.length === 9 && digits.startsWith('9')) {
    return '0' + digits;
  }
  // Already 09xxxxxxxx or 07xxxxxxxx
  if (digits.length === 10 && (digits.startsWith('09') || digits.startsWith('07'))) {
    return digits;
  }
  return undefined;
}

/**
 * Build a unique merchant reference. Combines order suffix + timestamp +
 * random suffix so retries within the same millisecond can't collide.
 */
function buildTxRef(orderId) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `FD-${orderId.slice(-8)}-${Date.now()}-${suffix}`;
}

/**
 * Asks Chapa for the real state of the payment, then updates the order.
 * Never trusts anything except what Chapa returns.
 */
async function verifyAndUpdate(txRef) {
  const order = await prisma.order.findUnique({ where: { txRef } });
  if (!order) return { paid: false, reason: 'Order not found', order: null };

  // Already paid — idempotent
  if (order.paymentStatus === 'paid') return { paid: true, order };

  let json;
  try {
    const res = await fetch(`${CHAPA_BASE}/transaction/verify/${txRef}`, {
      headers: chapaHeaders,
    });
    json = await res.json();
  } catch (err) {
    console.error('Chapa verify network error:', err);
    return { paid: false, reason: 'network_error', order };
  }

  const data = json && json.data;

  // Guard: make sure Chapa actually returned data for OUR tx_ref
  if (!data || data.tx_ref !== txRef) {
    console.warn('Chapa verify: tx_ref mismatch or missing data', {
      expected: txRef,
      got: data && data.tx_ref,
      status: json && json.status,
    });
    return { paid: false, reason: 'invalid_response', order };
  }

  const amountMatches =
    Math.abs(Number(data.amount) - Number(order.totalAmount)) < 0.01;
  const currencyOk = !data.currency || data.currency === 'ETB';

  const success =
    json.status === 'success' &&
    data.status === 'success' &&
    amountMatches &&
    currencyOk;

  if (success) {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'paid', paidAt: new Date() },
    });
    return { paid: true, order: updated };
  }

  // Persist failure/cancellation so the order reflects reality
  if (data.status === 'failed' || data.status === 'cancelled') {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'failed' },
    });
  }

  return { paid: false, reason: data.status || 'pending', order };
}

// ─────────────────────────────────────────────────────────────
// 1) Initialize payment — called by the app right after order creation
// ─────────────────────────────────────────────────────────────
router.post('/chapa/initialize', authenticate, async (req, res) => {
  let order = null;
  let txRef = null;

  try {
    const { orderId } = req.body;
    const customerId = req.user.id;

    order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { customer: true },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    txRef = buildTxRef(order.id);

    const fullName = (order.customer && order.customer.name) || 'Customer';
    const [firstName, ...rest] = fullName.trim().split(/\s+/);

    const payload = {
      amount: String(order.totalAmount), // server-side amount — never from client
      currency: 'ETB',
      email: order.customer?.email,
      first_name: firstName || 'Customer',
      last_name: rest.join(' ') || 'User',
      tx_ref: txRef,
      callback_url: `${PUBLIC_URL}/api/payments/chapa/webhook`,
      return_url: `${PUBLIC_URL}/api/payments/chapa/return?tx_ref=${txRef}`,
      customization: {
        title: 'Food Order',
        description: `Order ${order.id.slice(-6).toUpperCase()}`,
      },
    };

    // Only include phone if we can normalize it — sending an invalid phone
    // makes Chapa reject the whole request.
    const phone = normalizePhone(order.customer?.phone);
    if (phone) payload.phone_number = phone;

    const chapaRes = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: chapaHeaders,
      body: JSON.stringify(payload),
    });

    const json = await chapaRes.json();

    if (!chapaRes.ok || !json || !json.data || !json.data.checkout_url) {
      const msg =
        json && json.message
          ? typeof json.message === 'string'
            ? json.message
            : JSON.stringify(json.message)
          : 'Could not start payment';

      console.error('Chapa init failed:', {
        status: chapaRes.status,
        response: json,
        payload: { ...payload, email: '<redacted>' },
      });

      // Persist the failed attempt so we know a payment was tried
      await prisma.order.update({
        where: { id: order.id },
        data: { txRef, paymentMethod: 'chapa', paymentStatus: 'failed' },
      });

      return res.status(400).json({ message: msg });
    }

    // Persist the reference so verify/webhook can find the order
    await prisma.order.update({
      where: { id: order.id },
      data: { txRef, paymentMethod: 'chapa', paymentStatus: 'pending' },
    });

    return res.json({
      checkoutUrl: json.data.checkout_url,
      txRef,
    });
  } catch (err) {
    console.error('Chapa initialize error:', err);

    // Best-effort: mark as failed if we have an order + txRef
    if (order && txRef) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { txRef, paymentMethod: 'chapa', paymentStatus: 'failed' },
        });
      } catch (dbErr) {
        console.error('Failed to persist failed payment state:', dbErr);
      }
    }

    return res.status(500).json({ message: 'Payment initialization failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// 2) Verify after Chapa redirects back — called by the app
// ─────────────────────────────────────────────────────────────
router.get('/chapa/verify/:txRef', authenticate, async (req, res) => {
  try {
    const customerId = req.user.id;
    const owned = await prisma.order.findFirst({
      where: { txRef: req.params.txRef, customerId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ message: 'Order not found' });

    const result = await verifyAndUpdate(req.params.txRef);
    res.json({ paid: result.paid, reason: result.reason });
  } catch (err) {
    console.error('Chapa verify error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// 3) Webhook — Chapa calls this after payment (backup path)
//    Never trusts the body; only reads tx_ref, then re-verifies.
// ─────────────────────────────────────────────────────────────
router.all('/chapa/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const txRef = body.tx_ref || body.trx_ref || query.tx_ref;
    if (txRef) await verifyAndUpdate(String(txRef));
    res.sendStatus(200);
  } catch (err) {
    console.error('Chapa webhook error:', err);
    res.sendStatus(200); // always 200 so Chapa doesn't keep retrying
  }
});

// ─────────────────────────────────────────────────────────────
// 4) Return page — WebView lands here; the app detects the URL and verifies
// ─────────────────────────────────────────────────────────────
router.get('/chapa/return', (req, res) => {
  const txRef = String(req.query.tx_ref || '');
  res.send(
    '<!doctype html><html><head>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Payment</title></head>' +
      '<body style="font-family:sans-serif;text-align:center;padding-top:80px">' +
      '<h3>Processing payment…</h3>' +
      '<p style="color:#888;font-size:13px">You can return to the app.</p>' +
      (txRef ? `<p style="color:#aaa;font-size:11px">ref: ${txRef}</p>` : '') +
      '</body></html>'
  );
});

module.exports = router;