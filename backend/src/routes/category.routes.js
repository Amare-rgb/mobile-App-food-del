const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
} = require("../controller/category.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// GET all categories  →  public (customers need this to browse menu)
router.get("/", getCategories);

// POST create a new category  →  admin only
router.post("/", authenticate, requireRole("admin"), createCategory);

module.exports = router;