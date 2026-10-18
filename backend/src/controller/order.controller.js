const { z } = require('zod');
const { prisma } = require('../lib/prisma');

// ═══════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════
const createSchema = z.object({
  items: z
    .array(
      z.object({
        foodId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'At least one item is required'),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  deliveryAddress: z.any().optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  deliveryAddr: z.string().optional(),
  totalAmount: z.number().positive().optional(),
});

const statusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'APPROVED', 'REJECTED']),
});

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
async function enrichItems(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (items.length === 0) return [];
  const foodIds = items.map((i) => i.foodId).filter(Boolean);
  if (foodIds.length === 0) return items;

  const foods = await prisma.menuItem.findMany({
    where: { id: { in: foodIds } },
    select: { id: true, name: true, price: true, image: true },
  });
  const map = new Map(foods.map((f) => [f.id, f]));

  return items.map((i) => {
    const food = map.get(i.foodId);
    const price = food ? Number(food.price) : 0;
    const quantity = Number(i.quantity) || 0;
    return {
      foodId: i.foodId,
      quantity,
      name: food?.name || i.name || 'Item',
      price,
      image: food?.image || i.image || null,
      lineTotal: price * quantity,
    };
  });
}

const transformOrder = (o, enrichedItems) => ({
  id: o.id,
  _id: o.id,
  customerId: o.customerId,
  courierId: o.courierId,
  courier: o.courier || null,
  customer: o.customer || null,
  user: o.customer || null,
  restaurant: o.restaurant || null,
  status: (o.status || 'pending').toLowerCase(),
  items: enrichedItems || o.items || [],
  total: o.totalAmount,
  totalAmount: o.totalAmount,
  paymentMethod: o.paymentMethod || 'cash',
  paymentStatus: o.paymentStatus || 'pending',
  notes: o.notes || null,
  deliveryAddr: o.deliveryAddr,
  deliveryLat: o.deliveryLat,
  deliveryLng: o.deliveryLng,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
});

// ═══════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════
exports.create = async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { items, paymentMethod, notes, deliveryAddress } = parsed.data;
    const foodIds = items.map((i) => i.foodId);
    const foods = await prisma.menuItem.findMany({ where: { id: { in: foodIds } } });

    if (foods.length === 0) return res.status(400).json({ error: 'No valid food items found' });

    const totalAmount = items.reduce((sum, item) => {
      const food = foods.find((f) => f.id === item.foodId);
      return sum + (food ? Number(food.price) * item.quantity : 0);
    }, 0);

    const deliveryLat = parsed.data.deliveryLat ?? deliveryAddress?.lat ?? 0;
    const deliveryLng = parsed.data.deliveryLng ?? deliveryAddress?.lng ?? 0;
    const deliveryAddr =
      parsed.data.deliveryAddr ?? deliveryAddress?.address ?? deliveryAddress?.addr ?? '';

    const baseData = {
      customerId: req.user.id,
      items,
      totalAmount,
      deliveryLat,
      deliveryLng,
      deliveryAddr,
      status: 'pending',
    };

    const optionalData = {};
    if (paymentMethod !== undefined) optionalData.paymentMethod = paymentMethod;
    if (notes !== undefined) optionalData.notes = notes;

    let order;
    try {
      order = await prisma.order.create({
        data: { ...baseData, ...optionalData },
        include: { courier: true, customer: true },
      });
    } catch (err) {
      if (optionalData.paymentMethod || optionalData.notes) {
        order = await prisma.order.create({
          data: baseData,
          include: { courier: true, customer: true },
        });
      } else {
        throw err;
      }
    }

    const enrichedItems = await enrichItems(order.items);
    return res.json({ success: true, data: transformOrder(order, enrichedItems) });
  } catch (e) {
    console.error('createOrder error:', e);
    return res.status(500).json({ error: 'Failed to create order' });
  }
};

// ═══════════════════════════════════════════
// LIST MINE
// ═══════════════════════════════════════════
exports.listMine = async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    const where = role === 'courier' ? { courierId: req.user.id } : { customerId: req.user.id };

    const orders = await prisma.order.findMany({
      where,
      include: { courier: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const data = await Promise.all(
      orders.map(async (o) => transformOrder(o, await enrichItems(o.items)))
    );
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('listMine error:', e);
    res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
};

// ═══════════════════════════════════════════
// LIST PENDING
// ═══════════════════════════════════════════
exports.listPending = async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: null, status: 'approved' },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const data = await Promise.all(
      orders.map(async (o) => transformOrder(o, await enrichItems(o.items)))
    );
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('listPending error:', e);
    res.status(500).json({ success: false, message: 'Failed to load pending orders' });
  }
};

// ═══════════════════════════════════════════
// LIST ALL (admin)
// ═══════════════════════════════════════════
exports.listAll = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      const s = String(status).toLowerCase();
      if (!VALID_STATUSES.includes(s)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      where.status = s;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = await Promise.all(
      orders.map(async (o) => transformOrder(o, await enrichItems(o.items)))
    );
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('listAll error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ═══════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════
exports.getStats = async (_req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalOrders, pending, approved, rejected, revenueAgg, todayOrders, todayRevenueAgg] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'pending' } }),
        prisma.order.count({ where: { status: 'approved' } }),
        prisma.order.count({ where: { status: 'rejected' } }),
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'approved' } }),
        prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: todayStart }, status: 'approved' },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pending,
        approved,
        rejected,
        revenue: revenueAgg._sum.totalAmount || 0,
        todayOrders,
        todayRevenue: todayRevenueAgg._sum.totalAmount || 0,
      },
    });
  } catch (e) {
    console.error('getStats error:', e);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

// ═══════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════
exports.getById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { courier: true, customer: true },
    });
    if (!order) return res.status(404).json({ error: 'Not found' });

    const role = (req.user.role || '').toLowerCase();
    const isOwner = order.customerId === req.user.id;
    const isCourier = order.courierId === req.user.id;
    const isAdmin = role === 'admin';

    if (!isOwner && !isCourier && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const enrichedItems = await enrichItems(order.items);
    res.json({ success: true, data: transformOrder(order, enrichedItems) });
  } catch (e) {
    console.error('getById error:', e);
    res.status(500).json({ error: 'Failed to load order' });
  }
};

// ═══════════════════════════════════════════
// ACCEPT
// ═══════════════════════════════════════════
exports.accept = async (req, res) => {
  if ((req.user.role || '').toLowerCase() !== 'courier') {
    return res.status(403).json({ error: 'Couriers only' });
  }
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved orders can be accepted' });
    }
    if (existing.courierId && existing.courierId !== req.user.id) {
      return res.status(409).json({ error: 'Order already taken' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { courierId: req.user.id },
      include: { courier: true, customer: true },
    });

    const enrichedItems = await enrichItems(order.items);
    res.json({ success: true, data: transformOrder(order, enrichedItems) });
  } catch (e) {
    console.error('accept error:', e);
    res.status(500).json({ error: 'Failed to accept order' });
  }
};

// ═══════════════════════════════════════════
// UPDATE STATUS
// ═══════════════════════════════════════════
exports.updateStatus = async (req, res) => {
  if ((req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const newStatus = parsed.data.status.toLowerCase();

  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${existing.status}` });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: newStatus },
      include: { courier: true, customer: true },
    });

    const enrichedItems = await enrichItems(order.items);
    res.json({ success: true, data: transformOrder(order, enrichedItems) });
  } catch (e) {
    console.error('updateStatus error:', e);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// ═══════════════════════════════════════════
// 🗑️ DELETE ORDER (Admin Only)
// ═══════════════════════════════════════════
exports.deleteOrder = async (req, res) => {
  if ((req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await prisma.order.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (e) {
    console.error('deleteOrder error:', e);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};