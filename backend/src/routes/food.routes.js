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

router.get("/", getFoods);
router.post("/", createFood);
router.put("/:id", updateFood);
router.post("/upload", upload.single("image"), uploadFoodImage);
router.delete("/:id", deleteFood);

module.exports = router;