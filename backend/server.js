require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const os = require("os"); // ✅ Added to get your real IP dynamically

const { prisma } = require("./src/lib/prisma");
const { sendPush } = require("./src/utils/notifications");

// ─── Routes ───
const authRoutes = require("./src/routes/auth.routes");
const orderRoutes = require("./src/routes/orders.routes");
const gpsRoutes = require("./src/routes/gps.routes");
const categoryRoutes = require("./src/routes/category.routes");
const foodRoutes = require("./src/routes/food.routes");
const paymentRoutes = require("./src/routes/payment.routes"); // 💳 Chapa

// ✅ Must match the OrderStatus enum in schema.prisma
const VALID_ORDER_STATUSES = ["pending", "approved", "rejected"];

const app = express();

// ---------- Ensure uploads folder exists ----------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads folder: ${uploadsDir}`);
}

// ---------- Global middleware ----------
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Chapa may post form-encoded data

// ---------- Static files ----------
app.use("/uploads", express.static(uploadsDir));

// ---------- Request logger ----------
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ---------- Health & root ----------
app.get("/", (_req, res) => {
  res.json({
    name: "Food Delivery API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      orders: "/api/orders",
      categories: "/api/categories",
      foods: "/api/foods",
      gps: "/api/gps",
      payments: "/api/payments",
      uploads: "/uploads",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
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
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0"; // ✅ Listen on all network interfaces

async function start() {
  console.log("");
  console.log("  🏥 FOOD DELIVERY SERVER STARTING");

  // 💳 Chapa configuration check
  console.log("💳 Payments:");
  if (!process.env.CHAPA_SECRET_KEY) {
    console.warn("   ⚠️  CHAPA_SECRET_KEY is missing in .env — online payment will fail");
  } else {
    console.log("   ✅ CHAPA_SECRET_KEY loaded");
  }
  if (!process.env.PUBLIC_API_URL) {
    console.warn("   ⚠️  PUBLIC_API_URL is missing in .env — set it to your ngrok/public HTTPS URL");
  } else {
    console.log(`   ✅ PUBLIC_API_URL: ${process.env.PUBLIC_API_URL}`);
  }

  console.log("🗄️  Database:");

  try {
    const t0 = Date.now();
    await prisma.$connect();
    const ms = Date.now() - t0;
    console.log(`   ✅ Connected to PostgreSQL (${ms}ms)`);

    const [users, menuItems, orders, couriers, history, categories] =
      await Promise.all([
        prisma.user.count(),
        prisma.menuItem.count(),
        prisma.order.count(),
        prisma.courierLocation.count(),
        prisma.locationHistory.count(),
        prisma.category.count(),
      ]);

    console.log(
      `   📊 Users: ${users}, MenuItems: ${menuItems}, Categories: ${categories}`
    );
    console.log(
      `   📊 Orders: ${orders}, Couriers: ${couriers}, History: ${history}`
    );

    if (users === 0) {
      console.log("\n   ⚠️  Database is empty — run:  npx prisma db seed\n");
    }
  } catch (e) {
    console.error(`   ❌ Database connection FAILED`);
    console.error(`   ${e.message}`);
    console.error("\n   🔧 Troubleshooting:");
    console.error("      1. Is PostgreSQL running?");
    console.error("      2. Is DATABASE_URL correct in .env?");
    console.error("      3. Have you run migrations?  npx prisma migrate dev");
    console.error("      4. Is the client generated?  npx prisma generate\n");
    process.exit(1);
  }

  // ─── HTTP + Socket.io ───
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join_order_room", ({ order_id }) => {
      if (!order_id) return;
      socket.join(`order_${order_id}`);
      console.log(`👤 Joined room order_${order_id}`);
    });

    socket.on("leave_order_room", ({ order_id }) => {
      if (!order_id) return;
      socket.leave(`order_${order_id}`);
      console.log(`👋 Left room order_${order_id}`);
    });

    socket.on("courier_online", async ({ courier_id }) => {
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

    socket.on("update_location", async (payload) => {
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

            // ✅ Arrival is only broadcast. The order status is NOT changed here,
            //    because "delivered" is not in the OrderStatus enum
            //    (pending | approved | rejected) and Prisma would throw.
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

        const room = order_id
          ? `order_${order_id}`
          : `courier_${courier_id}`;
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

      // ✅ Reject values that are not in the enum instead of crashing Prisma
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

        const messages = {
          pending: "Order received ⏳",
          approved: "Your order was approved ✅",
          rejected: "Your order was rejected ❌",
        };

        if (messages[status]) {
          await sendPush(order.customerId, "Order Update", messages[status], {
            order_id,
            status,
          });
        }
      } catch (e) {
        console.error("Status update error:", e);
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

  // ─── Listen ───
  server.listen(PORT, HOST, () => {
    // ✅ Dynamically find your real network IP
    const networkInterfaces = os.networkInterfaces();
    let localIp = "localhost";
    for (const interfaceName in networkInterfaces) {
      for (const iface of networkInterfaces[interfaceName]) {
        if (iface.family === "IPv4" && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }

    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("   ✅ SERVER READY");
    console.log("═══════════════════════════════════════════");
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://${localIp}:${PORT}`); // ✅ Prints real IP
    console.log(`   Uploads:  http://${localIp}:${PORT}/uploads`);
    console.log(`   Socket.io ready`);
    console.log(`   GPS tracking enabled`);
    console.log("");
    console.log("   Routes available:");
    console.log("     POST   /api/auth/signup");
    console.log("     POST   /api/auth/login");
    console.log("     GET    /api/auth/me");
    console.log("     GET    /api/orders/my");
    console.log("     GET    /api/orders/all");
    console.log("     GET    /api/orders/stats");
    console.log("     GET    /api/categories");
    console.log("     GET    /api/foods");
    console.log("     DELETE /api/foods/:id");
    console.log("     POST   /api/payments/chapa/initialize");
    console.log("     GET    /api/payments/chapa/verify/:txRef");
    console.log("═══════════════════════════════════════════");
    console.log("");
  });
}

start();