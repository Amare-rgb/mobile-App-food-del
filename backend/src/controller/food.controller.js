const { prisma } = require("../lib/prisma");
const cloudinary = require("cloudinary").v2;

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
      imageUrl: f.imageUrl || "",
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
// ─────────────────────────────────────────────────────────────
exports.createFood = async (req, res) => {
  try {
    const {
      name, description, price, categoryId,
      rating, isPopular, isAvailable, imageUrl, imagePublicId
    } = req.body;

    // ✅ FIX: Check for image in req.file OR req.body.imageUrl
    const finalImageUrl = req.file ? req.file.path : imageUrl;
    const finalPublicId = req.file ? req.file.filename : imagePublicId;

    if (!name || !price || !categoryId) {
      return res.status(400).json({
        error: "name, price and categoryId are required",
      });
    }

    if (!finalImageUrl) {
      return res.status(400).json({ error: "image is required" });
    }

    const food = await prisma.menuItem.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        imageUrl: finalImageUrl,           // ✅ Saved URL
        imagePublicId: finalPublicId,      // ✅ Saved ID
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
      rating, isPopular, isAvailable, imageUrl, imagePublicId
    } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

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
    } else if (imageUrl !== undefined) {
      data.imageUrl = imageUrl;
      if (imagePublicId !== undefined) {
        data.imagePublicId = imagePublicId;
      }
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
// ─────────────────────────────────────────────────────────────
exports.uploadFoodImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    return res.status(200).json({
      message: "Uploaded to Cloudinary",
      imageUrl: req.file.path,
      publicId: req.file.filename,
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
// ─────────────────────────────────────────────────────────────
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

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