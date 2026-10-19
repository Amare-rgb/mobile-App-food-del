const express = require("express");
const router = express.Router();
const authController = require("../controller/auth.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

// ═══════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════
router.post("/signup", authController.signup);
router.post("/register", authController.signup); // Alias for frontend
router.post("/login", authController.login);

// ═══════════════════════════════════════════
// AUTHENTICATED — profile
// ═══════════════════════════════════════════
router.get("/me", authenticate, authController.me);
router.put("/me", authenticate, authController.updateProfile);
router.put("/profile", authenticate, authController.updateProfile); // Settings screen alias
router.put("/password", authenticate, authController.changePassword);

// Avatar upload → goes to Cloudinary now
router.post(
  "/avatar",
  authenticate,
  upload.single("image"),         // ✅ multer parses the file first
  authController.uploadAvatar     // ✅ move logic into controller
);

// FCM token
router.post("/fcm-token", authenticate, authController.saveFcmToken);

// ═══════════════════════════════════════════
// ADMIN ONLY  🔒
// ═══════════════════════════════════════════
router.get(
  "/users",
  authenticate,
  requireRole("admin"),
  authController.getAllUsers
);

router.put(
  "/users/:id/role",
  authenticate,
  requireRole("admin"),
  authController.updateUserRole
);

router.delete(
  "/users/:id",
  authenticate,
  requireRole("admin"),
  authController.deleteUser
);

module.exports = router;