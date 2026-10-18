const { prisma } = require("../lib/prisma");

// ═══════════════════════════════════════════
// GET /api/categories
// ═══════════════════════════════════════════
exports.getCategories = async (_req, res) => {
  try {
    // Fetch categories and use Prisma's relation count to get the number of items
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: { menuItems: true }, // 👈 Counts the related MenuItems
        },
      },
    });

    // Format the response for the frontend
    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      itemCount: c._count.menuItems, // 👈 Maps the count to itemCount
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
    const { name, icon } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon || "fast-food", // Default icon if none provided
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    // Prisma error code P2002 means a unique constraint failed (duplicate name)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A category with this name already exists" });
    }
    
    console.error("❌ createCategory error:", error);
    return res.status(500).json({ error: "Failed to create category" });
  }
};