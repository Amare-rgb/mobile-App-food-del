const { prisma } = require("../lib/prisma");
const {
  distanceMeters,
  estimateEtaSeconds,
  formatEta,
} = require("../utils/geo");

const ARRIVAL_THRESHOLD_M = 100;    // treat < 100 m as "arrived"
const HISTORY_INTERVAL_MS = 15000;  // save history every 15 s

async function updateCourierLocation({
  courierId,
  orderId,
  lat,
  lng,
  heading = 0,
  speed = 0,
  accuracy = 0,
}) {
  // 1. Upsert live location
  const live = await prisma.courierLocation.upsert({
    where: { courierId },
    update: { lat, lng, heading, speed, accuracy, isOnline: true },
    create: { courierId, lat, lng, heading, speed, accuracy, isOnline: true },
  });

  // 2. Throttled history insert
  if (orderId) {
    const last = await prisma.locationHistory.findFirst({
      where: { orderId, courierId },
      orderBy: { createdAt: "desc" },
    });

    const shouldSave =
      !last ||
      Date.now() - last.createdAt.getTime() > HISTORY_INTERVAL_MS ||
      distanceMeters(last.lat, last.lng, lat, lng) > 50;

    if (shouldSave) {
      await prisma.locationHistory.create({
        data: { courierId, orderId, lat, lng, heading, speed },
      });
    }
  }

  return live;
}

async function computeEta(orderId, courierLat, courierLng) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  const distance = distanceMeters(
    courierLat,
    courierLng,
    order.deliveryLat,
    order.deliveryLng
  );

  const live = order.courierId
    ? await prisma.courierLocation.findUnique({
        where: { courierId: order.courierId },
      })
    : null;

  const speed = live?.speed && live.speed > 1 ? live.speed : 8;
  const etaSeconds = estimateEtaSeconds(distance, speed);

  return {
    distanceMeters: Math.round(distance),
    distanceKm: +(distance / 1000).toFixed(2),
    etaSeconds,
    etaText: formatEta(etaSeconds),
  };
}

async function checkArrival(orderId, courierLat, courierLng) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { arrived: false, distance: null };

  const distance = distanceMeters(
    courierLat,
    courierLng,
    order.deliveryLat,
    order.deliveryLng
  );

  return {
    arrived: distance <= ARRIVAL_THRESHOLD_M,
    distance: Math.round(distance),
  };
}

async function goOffline(courierId) {
  try {
    await prisma.courierLocation.update({
      where: { courierId },
      data: { isOnline: false },
    });
  } catch {
    // No row yet — nothing to do
  }
}

module.exports = {
  updateCourierLocation,
  computeEta,
  checkArrival,
  goOffline,
  ARRIVAL_THRESHOLD_M,
};