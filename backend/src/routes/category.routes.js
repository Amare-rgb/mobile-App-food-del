const express = require("express");
const router = express.Router();
const { getCategories, createCategory } = require("../controller/category.controller");

// GET all categories
router.get("/", getCategories);

// POST create a new category
router.post("/", createCategory);

module.exports = router;