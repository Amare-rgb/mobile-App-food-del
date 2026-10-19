const express = require("express");
const router = express.Router();
const {
  getFoods,
  createFood,
  updateFood,
  uploadFoodImage,
  deleteFood,
} = require("../controller/food.controller");
const { upload } = require("../middleware/upload");
const { authenticate, requireRole } = require("../middleware/auth");

// ─── Public ───
router.get("/", getFoods);

// ─── Admin only ───
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("image"),   // ✅ parse file
  createFood                // ✅ uses req.file.path (Cloudinary)
);

router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("image"),   // ✅ allows replacing image
  updateFood
);

router.post(
  "/upload",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  uploadFoodImage
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  deleteFood
);

module.exports = router;