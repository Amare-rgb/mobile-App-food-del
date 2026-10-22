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

// ✅ FIX: Placed /upload BEFORE /:id so Express doesn't confuse "upload" with an ID
router.post(
  "/upload",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  uploadFoodImage
);

// ✅ Create Food 
// (Controller handles req.body.imageUrl if no file, or req.file.path if file uploaded)
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("image"),   
  createFood                
);

// ✅ Update Food
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("image"),   
  updateFood
);

// ✅ Delete Food
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  deleteFood
);

module.exports = router;