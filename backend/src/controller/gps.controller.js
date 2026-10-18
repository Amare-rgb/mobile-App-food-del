const { prisma } = require('../lib/prisma');
const gps = require('../services/gps.service');

// ═══════════════════════════════════════════
// POST /api/gps/courier/location
// Courier pushes current position
// ═══════════════════════════════════════════
exports.pushLocation = async (req, res) => {
  const {
    lat,
    lng,
    heading = 0,
    speed = 0,
    accuracy = 0,
    orderId,
  } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res
      .status(400)
      .json({ success: false, error: 'lat and lng must be numbers' });
  }

  try {
    await gps.updateCourierLocation({
      courierId: req.user.id,
      orderId: orderId || null,
      lat,
      lng,
      heading,
      speed,
      accuracy,
    });

    let eta = null;
    if (orderId) eta = await gps.computeEta(orderId, lat, lng);

    res.json({ success: true, ok: true, eta });
  } catch (e) {
    console.error('pushLocation error:', e);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update location' });
  }
};

// ═══════════════════════════════════════════
// GET /api/gps/order/:orderId/courier
// Customer fetches courier's live position + ETA
// ═══════════════════════════════════════════
exports.getCourierForOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        courier: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: 'Order not found' });
    }

    if (!order.courierId) {
      return res
        .status(404)
        .json({ success: false, error: 'No courier assigned yet' });
    }

    const location = await prisma.courierLocation.findUnique({
      where: { courierId: order.courierId },
    });

    if (!location) {
      return res
        .status(404)
        .json({ success: false, error: 'Courier has no location yet' });
    }

    const eta = await gps.computeEta(orderId, location.lat, location.lng);

    res.json({
      success: true,
      courier: {
        id: order.courier.id,
        name: order.courier.name,
        phone: order.courier.phone,
      },
      location: {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        updatedAt: location.updatedAt,
      },
      destination: {
        lat: order.deliveryLat,
        lng: order.deliveryLng,
        address: order.deliveryAddr,
      },
      eta,
    });
  } catch (e) {
    console.error('getCourierForOrder error:', e);
    res
      .status(500)
      .json({ success: false, error: 'Failed to load courier location' });
  }
};

// ═══════════════════════════════════════════
// GET /api/gps/order/:orderId/history
// Full trail of courier positions for one order
// ═══════════════════════════════════════════
exports.getOrderHistory = async (req, res) => {
  try {
    const points = await prisma.locationHistory.findMany({
      where: { orderId: req.params.orderId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, points });
  } catch (e) {
    console.error('getOrderHistory error:', e);
    res
      .status(500)
      .json({ success: false, error: 'Failed to load history' });
  }
};

// ═══════════════════════════════════════════
// GET /api/gps/couriers/online
// Admin: list all online couriers
// ═══════════════════════════════════════════
exports.listOnlineCouriers = async (_req, res) => {
  try {
    const couriers = await gps.listOnlineCouriers();

    res.json({
      success: true,
      data: couriers.map((c) => ({
        courierId: c.courierId,
        name: c.courier.name,
        email: c.courier.email,
        lat: c.lat,
        lng: c.lng,
        heading: c.heading,
        speed: c.speed,
        accuracy: c.accuracy,
        orderId: c.orderId,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    console.error('listOnlineCouriers error:', e);
    res
      .status(500)
      .json({ success: false, error: 'Failed to load couriers' });
  }
};

// ═══════════════════════════════════════════
// POST /api/gps/offline
// Courier marks themselves offline
// ═══════════════════════════════════════════
exports.goOffline = async (req, res) => {
  try {
    await gps.goOffline(req.user.id);
    res.json({ success: true, ok: true });
  } catch (e) {
    console.error('goOffline error:', e);
    res
      .status(500)
      .json({ success: false, error: 'Failed to go offline' });
  }
};