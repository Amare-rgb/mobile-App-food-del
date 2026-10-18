const { prisma } = require("../lib/prisma");

// GET /api/foods
exports.getFoods = async (req, res) => {
  try {
    const foods = await prisma.menuItem.findMany({
      include: {
        category: true, // 👈 Include the linked category
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = foods.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description || "",
      price: Number(f.price),
      image: f.image || "",
      rating: Number(f.rating ?? 4.5),
      isPopular: Boolean(f.isPopular ?? false),
      isAvailable: Boolean(f.isAvailable ?? true),
      categoryId: f.categoryId,
      category: f.category ? f.category.name : "", // 👈 Extract the category name string
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ getFoods error:", error);
    return res.status(500).json({ error: "Failed to fetch foods" });
  }
};

// POST /api/foods
exports.createFood = async (req, res) => {
  try {
    const {
      name, description, price, image, categoryId,
      rating, isPopular, isAvailable,
    } = req.body;

    if (!name || !price || !image || !categoryId) {
      return res.status(400).json({
        error: "name, price, image and categoryId are required",
      });
    }

    const food = await prisma.menuItem.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        image,
        category: { connect: { id: categoryId } }, // 👈 Connect using relation
        rating: Number(rating ?? 4.5),
        isPopular: Boolean(isPopular ?? false),
        isAvailable: Boolean(isAvailable ?? true),
      },
      include: { category: true },
    });

    return res.status(201).json(food);
  } catch (error) {
    console.error("❌ createFood error:", error);
    return res.status(500).json({ error: "Failed to create food" });
  }
};

// PUT /api/foods/:id
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, price, image, categoryId,
      rating, isPopular, isAvailable,
    } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(image !== undefined && { image }),
        // 👈 Handle relation update if categoryId is provided
        ...(categoryId !== undefined && { category: { connect: { id: categoryId } } }),
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
      },
      include: { category: true },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("❌ updateFood error:", error);
    return res.status(500).json({ error: "Failed to update food" });
  }
};

// POST /api/foods/upload
exports.uploadFoodImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    return res.status(200).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("❌ uploadFoodImage error:", error);
    return res.status(500).json({ error: "Failed to upload image" });
  }
};

// DELETE /api/foods/:id
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Food not found" });
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.status(200).json({ message: "Food deleted", id });
  } catch (error) {
    console.error("❌ deleteFood error:", error);
    return res.status(500).json({ error: "Failed to delete food" });
  }
};