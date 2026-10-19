const express = require("express");
const router = express.Router();
const orderController = require("../controller/order.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// All order routes require login
router.use(authenticate);

// ─── Specific routes FIRST (must come before /:id) ───
router.get("/my", orderController.listMine);
router.get("/mine", orderController.listMine); // alias

// 🔒 Admin only — full list, pending queue, stats
router.get("/all", requireRole("admin"), orderController.listAll);
router.get("/pending/list", requireRole("admin", "courier"), orderController.listPending);
router.get("/stats", requireRole("admin"), orderController.getStats);

// ─── Create ───
router.post("/", orderController.create);

// ─── Dynamic routes LAST ───
router.get("/:id", orderController.getById);

// 🛵 Couriers accept orders (admin can too, if needed)
router.post("/:id/accept", requireRole("courier", "admin"), orderController.accept);

// Status updates — admin only (approve/reject)
router.patch("/:id/status", requireRole("admin"), orderController.updateStatus);
router.put("/:id/status", requireRole("admin"), orderController.updateStatus);

// 🗑️ Delete order — admin only
router.delete("/:id", requireRole("admin"), orderController.deleteOrder);

module.exports = router;