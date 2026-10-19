const { prisma } = require("../lib/prisma");

// ═══════════════════════════════════════════
// GET /api/categories
// ═══════════════════════════════════════════
exports.getCategories = async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        imageUrl: true, // ✅ new field from schema
        _count: {
          select: { menuItems: true },
        },
      },
    });

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      imageUrl: c.imageUrl || null, // ✅ expose to frontend
      itemCount: c._count.menuItems,
    }));

    res.set("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ getCategories error:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// ═══════════════════════════════════════════
// POST /api/categories
// ═══════════════════════════════════════════
exports.createCategory = async (req, res) => {
  try {
    const { name, icon, imageUrl } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    // ✅ Optional: accept uploaded file from Cloudinary (if route uses upload)
    const finalImageUrl = req.file ? req.file.path : imageUrl || null;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon || "fast-food",
        imageUrl: finalImageUrl, // ✅ now persisted
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A category with this name already exists" });
    }

    console.error("❌ createCategory error:", error);
    return res.status(500).json({ error: "Failed to create category" });
  }
};

// ═══════════════════════════════════════════
// PUT /api/categories/:id  (bonus — you'll want this)
// ═══════════════════════════════════════════
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, imageUrl } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    const data = {};
    if (name !== undefined) {
      if (name.trim() === "") {
        return res.status(400).json({ error: "Category name cannot be empty" });
      }
      data.name = name.trim();
    }
    if (icon !== undefined) data.icon = icon;
    if (req.file) data.imageUrl = req.file.path;
    else if (imageUrl !== undefined) data.imageUrl = imageUrl;

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return res.status(200).json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A category with this name already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    console.error("❌ updateCategory error:", error);
    return res.status(500).json({ error: "Failed to update category" });
  }
};

// ═══════════════════════════════════════════
// DELETE /api/categories/:id  (bonus)
// ═══════════════════════════════════════════
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ✅ Safety — don't silently cascade-delete 50 food items
    if (existing._count.menuItems > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${existing._count.menuItems} item(s). Move or delete them first.`,
      });
    }

    await prisma.category.delete({ where: { id } });

    return res.status(200).json({ message: "Category deleted", id });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    console.error("❌ deleteCategory error:", error);
    return res.status(500).json({ error: "Failed to delete category" });
  }
};