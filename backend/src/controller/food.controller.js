const { prisma } = require("../lib/prisma");
const { cloudinary } = require("../../cloudinary"); // ✅ for deleting from Cloudinary

// ─────────────────────────────────────────────────────────────
// GET /api/foods
// ─────────────────────────────────────────────────────────────
exports.getFoods = async (req, res) => {
  try {
    const foods = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = foods.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description || "",
      price: Number(f.price),
      imageUrl: f.imageUrl || "",          // ✅ renamed from `image`
      rating: Number(f.rating ?? 4.5),
      isPopular: Boolean(f.isPopular ?? false),
      isAvailable: Boolean(f.isAvailable ?? true),
      categoryId: f.categoryId,
      category: f.category ? f.category.name : "",
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ getFoods error:", error);
    return res.status(500).json({ error: "Failed to fetch foods" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/foods
// Accepts multipart/form-data with optional `image` file
// OR JSON with `imageUrl` (if the client already uploaded separately)
// ─────────────────────────────────────────────────────────────
exports.createFood = async (req, res) => {
  try {
    const {
      name, description, price, categoryId,
      rating, isPopular, isAvailable,
    } = req.body;

    // ✅ imageUrl comes from either the uploaded file or the body
    const imageUrl = req.file ? req.file.path : req.body.imageUrl || null;
    const imagePublicId = req.file ? req.file.filename : null;

    if (!name || !price || !categoryId) {
      return res.status(400).json({
        error: "name, price and categoryId are required",
      });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: "image is required" });
    }

    const food = await prisma.menuItem.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        imageUrl,           // ✅ Cloudinary HTTPS URL
        imagePublicId,      // ✅ Cloudinary public_id (for later deletion)
        category: { connect: { id: categoryId } },
        rating: Number(rating ?? 4.5),
        isPopular: isPopular === "true" || isPopular === true,
        isAvailable: isAvailable === "false" || isAvailable === false ? false : true,
      },
      include: { category: true },
    });

    return res.status(201).json(food);
  } catch (error) {
    console.error("❌ createFood error:", error);
    return res.status(500).json({ error: "Failed to create food" });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/foods/:id
// ─────────────────────────────────────────────────────────────
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, price, categoryId,
      rating, isPopular, isAvailable,
    } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

    // ✅ If a new image was uploaded, delete the old one from Cloudinary
    if (req.file && existing.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(existing.imagePublicId);
      } catch (clErr) {
        console.warn("⚠️ Cloudinary delete old image failed:", clErr.message);
      }
    }

    const data = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(categoryId !== undefined && { category: { connect: { id: categoryId } } }),
      ...(rating !== undefined && { rating: Number(rating) }),
      ...(isPopular !== undefined && { isPopular: isPopular === "true" || isPopular === true }),
      ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" || isAvailable === true }),
    };

    // ✅ Image update: prefer uploaded file, else imageUrl from body
    if (req.file) {
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
    } else if (req.body.imageUrl !== undefined) {
      data.imageUrl = req.body.imageUrl;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data,
      include: { category: true },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("❌ updateFood error:", error);
    return res.status(500).json({ error: "Failed to update food" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/foods/upload
// Standalone image upload — returns the Cloudinary URL
// ─────────────────────────────────────────────────────────────
exports.uploadFoodImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    // ✅ Cloudinary URL (e.g. https://res.cloudinary.com/.../food.jpg)
    return res.status(200).json({
      message: "Uploaded to Cloudinary",
      imageUrl: req.file.path,          // full HTTPS URL
      publicId: req.file.filename,      // Cloudinary public_id
      size: req.file.size,
      format: req.file.format || req.file.mimetype?.split("/")[1],
    });
  } catch (error) {
    console.error("❌ uploadFoodImage error:", error);
    return res.status(500).json({ error: "Failed to upload image" });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/foods/:id
// Deletes the DB row AND removes the image from Cloudinary
// ─────────────────────────────────────────────────────────────
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

    // ✅ Delete the image from Cloudinary first (best-effort)
    if (existing.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(existing.imagePublicId);
      } catch (clErr) {
        console.warn("⚠️ Cloudinary delete failed:", clErr.message);
      }
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.status(200).json({ message: "Food deleted", id });
  } catch (error) {
    console.error("❌ deleteFood error:", error);
    return res.status(500).json({ error: "Failed to delete food" });
  }
};