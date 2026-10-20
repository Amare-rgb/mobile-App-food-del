require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const { prisma } = require("./src/lib/prisma");
const { sendPush } = require("./src/utils/notifications");

// ─── Routes ───
const authRoutes = require("./src/routes/auth.routes");
const orderRoutes = require("./src/routes/orders.routes");
const gpsRoutes = require("./src/routes/gps.routes");
const categoryRoutes = require("./src/routes/category.routes");
const foodRoutes = require("./src/routes/food.routes");
const paymentRoutes = require("./src/routes/payment.routes"); // 💳 Chapa

// ✅ The app only uses these 3 statuses (all exist in the OrderStatus enum)
const VALID_ORDER_STATUSES = ["pending", "approved", "rejected"];

const STATUS_MESSAGES = {
  pending: "Order received ⏳",
  approved: "Your order was approved ✅",
  rejected: "Your order was rejected ❌",
};

const app = express();

// ✅ Fly.io puts a proxy in front of the app
app.set("trust proxy", 1);

// ---------- Global middleware ----------
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Chapa may post form-encoded data

// ---------- Request logger ----------
app.use((req, _res, next) => {
  if (req.url !== "/health") console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ---------- DB state (updated by the startup check) ----------
let dbReady = false;

// ---------- Health & root ----------
app.get("/", (_req, res) => {
  res.json({
    name: "Food Delivery API",
    version: "1.0.0",
    status: "running",
    storage: "cloudinary",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      orders: "/api/orders",
      categories: "/api/categories",
      foods: "/api/foods",
      gps: "/api/gps",
      payments: "/api/payments",
    },
  });
});

// Always 200 so Fly doesn't kill the machine on a temporary DB hiccup
app.get("/health", (_req, res) => {
  res.json({ ok: true, db: dbReady, time: new Date().toISOString() });
});

// ═══════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════
console.log("🔗 Registering routes...");

app.use("/api/auth", authRoutes);
console.log("   ✅ /api/auth");

app.use("/api/orders", orderRoutes);
console.log("   ✅ /api/orders");

app.use("/api/gps", gpsRoutes);
console.log("   ✅ /api/gps");

app.use("/api/categories", categoryRoutes);
console.log("   ✅ /api/categories");

app.use("/api/foods", foodRoutes);
console.log("   ✅ /api/foods");

app.use("/api/payments", paymentRoutes);
console.log("   ✅ /api/payments");

// ---------- 404 handler ----------
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---------- Config ----------
// Must match internal_port in fly.toml (8080 is the Fly default)
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

// ---------- Helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries a DB call (Neon can be waking up or the network flaky)
async function withRetry(fn, attempts = 4, delayMs = 3000) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        console.log(
          `   ⏳ DB attempt ${i}/${attempts} failed, retrying in ${delayMs / 1000}s...`
        );
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

async function checkDatabase() {
  console.log("🗄️  Database:");

  try {
    const t0 = Date.now();
    await withRetry(() => prisma.$connect());
    console.log(`   ✅ Connected to PostgreSQL (${Date.now() - t0}ms)`);

    // Sequential (not Promise.all) — gentler on a pooled connection
    const users = await withRetry(() => prisma.user.count());
    const menuItems = await withRetry(() => prisma.menuItem.count());
    const categories = await withRetry(() => prisma.category.count());
    const orders = await withRetry(() => prisma.order.count());
    const couriers = await withRetry(() => prisma.courierLocation.count());
    const history = await withRetry(() => prisma.locationHistory.count());

    console.log(
      `   📊 Users: ${users}, MenuItems: ${menuItems}, Categories: ${categories}`
    );
    console.log(
      `   📊 Orders: ${orders}, Couriers: ${couriers}, History: ${history}`
    );

    if (users === 0) {
      console.log("\n   ⚠️  Database is empty — run:  npx prisma db seed\n");
    }

    dbReady = true;
  } catch (e) {
    dbReady = false;
    console.error("   ❌ Database check FAILED");
    console.error(`   ${e.message}`);
    console.error("\n   🔧 Troubleshooting:");
    console.error("      1. Is DATABASE_URL set?  fly secrets list");
    console.error("      2. Is the Neon project active (not suspended / over quota)?");
    console.error("      3. Is the schema migrated?  npx prisma migrate deploy");
    console.error("      4. Was the client generated in the Docker build?  npx prisma generate\n");
  }
}

function logConfig() {
  console.log("");
  console.log("  🏥 FOOD DELIVERY SERVER STARTING");

  console.log("☁️  Cloudinary:");
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn("   ⚠️  CLOUDINARY_CLOUD_NAME is missing — image upload will fail");
  } else {
    console.log(`   ✅ CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    console.warn("   ⚠️  CLOUDINARY_API_KEY is missing");
  } else {
    console.log("   ✅ API_KEY loaded");
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.warn("   ⚠️  CLOUDINARY_API_SECRET is missing");
  } else {
    console.log("   ✅ API_SECRET loaded");
  }

  console.log("💳 Payments:");
  if (!process.env.CHAPA_SECRET_KEY) {
    console.warn("   ⚠️  CHAPA_SECRET_KEY is missing — online payment will fail");
  } else {
    console.log("   ✅ CHAPA_SECRET_KEY loaded");
  }
  if (!process.env.PUBLIC_API_URL) {
    console.warn("   ⚠️  PUBLIC_API_URL is missing — set it to https://<your-app>.fly.dev");
  } else {
    console.log(`   ✅ PUBLIC_API_URL: ${process.env.PUBLIC_API_URL}`);
  }
}

async function start() {
  logConfig();

  // ─── HTTP + Socket.io ───
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join_order_room", ({ order_id } = {}) => {
      if (!order_id) return;
      socket.join(`order_${order_id}`);
      console.log(`👤 Joined room order_${order_id}`);
    });

    socket.on("leave_order_room", ({ order_id } = {}) => {
      if (!order_id) return;
      socket.leave(`order_${order_id}`);
      console.log(`👋 Left room order_${order_id}`);
    });

    socket.on("courier_online", async ({ courier_id } = {}) => {
      if (!courier_id) return;
      socket.join(`courier_${courier_id}`);
      socket.data.courierId = courier_id;

      try {
        await prisma.courierLocation.upsert({
          where: { courierId: courier_id },
          update: { isOnline: true },
          create: { courierId: courier_id, lat: 0, lng: 0, isOnline: true },
        });
      } catch (e) {
        console.error("courier_online error:", e.message);
      }

      console.log(`🛵 Courier online: ${courier_id}`);
    });

    socket.on("update_location", async (payload = {}) => {
      const {
        courier_id,
        order_id,
        latitude,
        longitude,
        heading = 0,
        speed = 0,
        accuracy = 0,
      } = payload;

      if (!courier_id || latitude == null || longitude == null) {
        return socket.emit("gps_error", { error: "Missing required fields" });
      }

      try {
        await prisma.courierLocation.upsert({
          where: { courierId: courier_id },
          update: {
            lat: latitude,
            lng: longitude,
            heading,
            speed,
            accuracy,
            isOnline: true,
          },
          create: {
            courierId: courier_id,
            lat: latitude,
            lng: longitude,
            heading,
            speed,
            accuracy,
            isOnline: true,
          },
        });

        if (order_id) {
          await prisma.locationHistory.create({
            data: {
              courierId: courier_id,
              orderId: order_id,
              lat: latitude,
              lng: longitude,
              heading,
              speed,
            },
          });
        }

        let eta = null;
        let arrived = false;

        if (order_id) {
          const order = await prisma.order.findUnique({
            where: { id: order_id },
          });

          if (order) {
            const R = 6371000;
            const toRad = (d) => (d * Math.PI) / 180;
            const dLat = toRad(order.deliveryLat - latitude);
            const dLng = toRad(order.deliveryLng - longitude);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(latitude)) *
                Math.cos(toRad(order.deliveryLat)) *
                Math.sin(dLng / 2) ** 2;
            const distance = 2 * R * Math.asin(Math.sqrt(a));

            const avgSpeed = speed > 1 ? speed : 8;
            const etaSeconds = Math.max(1, Math.round(distance / avgSpeed));
            const etaText =
              etaSeconds < 60
                ? `${etaSeconds}s`
                : `${Math.round(etaSeconds / 60)} min`;

            eta = {
              distanceMeters: Math.round(distance),
              distanceKm: +(distance / 1000).toFixed(2),
              etaSeconds,
              etaText,
            };

            // Arrival is only broadcast. The order status is NOT changed here
            // because the app only uses pending / approved / rejected.
            if (distance <= 100) {
              arrived = true;
              io.to(`order_${order_id}`).emit("courier_arrived", {
                order_id,
                distance: Math.round(distance),
                timestamp: Date.now(),
              });
            }
          }
        }

        const room = order_id ? `order_${order_id}` : `courier_${courier_id}`;
        io.to(room).emit("courier_location_changed", {
          courier_id,
          order_id: order_id || null,
          latitude,
          longitude,
          heading,
          speed,
          accuracy,
          eta,
          arrived,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error("update_location error:", e);
        socket.emit("gps_error", { error: e.message });
      }
    });

    socket.on("order_status_change", async (payload) => {
      const { order_id, status } = payload || {};
      if (!order_id || !status) return;

      // ✅ Only pending / approved / rejected are allowed
      if (!VALID_ORDER_STATUSES.includes(status)) {
        return socket.emit("order_status_error", {
          error: `Invalid status "${status}". Allowed: ${VALID_ORDER_STATUSES.join(", ")}`,
        });
      }

      try {
        const order = await prisma.order.update({
          where: { id: order_id },
          data: { status },
        });

        io.to(`order_${order_id}`).emit("order_status_changed", {
          order_id,
          status,
          timestamp: Date.now(),
        });

        await sendPush(order.customerId, "Order Update", STATUS_MESSAGES[status], {
          order_id,
          status,
        });
      } catch (e) {
        console.error("Status update error:", e);
        socket.emit("order_status_error", { error: "Failed to update order status" });
      }
    });

    socket.on("disconnect", async () => {
      console.log("❌ Socket disconnected:", socket.id);
      const courierId = socket.data.courierId;
      if (courierId) {
        try {
          await prisma.courierLocation.update({
            where: { courierId },
            data: { isOnline: false },
          });
        } catch {}
      }
    });
  });

  // ─── Listen first, so Fly health checks pass immediately ───
  server.listen(PORT, HOST, () => {
    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("   ✅ SERVER READY");
    console.log("═══════════════════════════════════════════");
    console.log(`   Port:     ${PORT}`);
    console.log(`   Public:   ${process.env.PUBLIC_API_URL || "(PUBLIC_API_URL not set)"}`);
    console.log("   Cloudinary: enabled ☁️");
    console.log("   Socket.io ready");
    console.log("   GPS tracking enabled");
    console.log("═══════════════════════════════════════════");
    console.log("");

    // DB check runs in the background; it never kills the server
    checkDatabase();
  });

  // ─── Graceful shutdown (Fly sends SIGINT/SIGTERM when stopping) ───
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 ${signal} received, shutting down...`);

    io.close();
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch {}
      process.exit(0);
    });

    // Force exit if something hangs
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();