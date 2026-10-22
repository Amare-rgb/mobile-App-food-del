const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");

// ═══════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════

const signupSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

const sanitize = (user) => ({
  id: user.id,
  _id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatarUrl: user.avatarUrl || null,
  createdAt: user.createdAt,
});

// ═══════════════════════════════════════════
// PUBLIC — SIGNUP
// ═══════════════════════════════════════════
exports.signup = async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  const { name, email, password, phone } = parsed.data;

  try {
    const exists = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hash,
        phone: phone || null,
        role: "customer", 
      },
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: sanitize(user),
    });
  } catch (e) {
    console.error("Signup error:", e);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
};

// ═══════════════════════════════════════════
// PUBLIC — LOGIN
// ═══════════════════════════════════════════
exports.login = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: sanitize(user),
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ═══════════════════════════════════════════
// AUTHENTICATED — ME
// ═══════════════════════════════════════════
exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: sanitize(user) });
  } catch (e) {
    console.error("Me error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ═══════════════════════════════════════════
// AUTHENTICATED — UPDATE PROFILE
// ═══════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  const { name, email, phone, avatarUrl } = parsed.data;

  try {
    if (email) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existing && existing.id !== req.user.id) {
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.toLowerCase().trim() }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }), 
      },
    });

    res.json({ success: true, user: sanitize(user) });
  } catch (e) {
    console.error("Update profile error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ═══════════════════════════════════════════
// AUTHENTICATED — UPLOAD AVATAR
// ═══════════════════════════════════════════
exports.uploadAvatar = async (req, res) => {
  try {
    // ✅ 1. Verify Multer received the file
    if (!req.file) {
      console.error("❌ Multer did not receive a file. Check upload.single('avatar')");
      return res.status(400).json({ success: false, error: "No file uploaded", message: "No file uploaded" });
    }

    // ✅ 2. Cloudinary URL from multer-storage-cloudinary
    const avatarUrl = req.file.path;

    // ✅ 3. Save to database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    // ✅ 4. Return success with all possible key names the frontend might check
    res.json({
      success: true,
      message: "Avatar updated",
      url: avatarUrl,
      imageUrl: avatarUrl,
      user: sanitize(user),
    });
  } catch (e) {
    console.error("uploadAvatar error:", e);
    res.status(500).json({ success: false, message: "Upload failed", error: "Upload failed" });
  }
};

// ═══════════════════════════════════════════
// AUTHENTICATED — CHANGE PASSWORD
// ═══════════════════════════════════════════
exports.changePassword = async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hash },
    });

    res.json({ success: true, message: "Password updated" });
  } catch (e) {
    console.error("Change password error:", e);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
};

// ═══════════════════════════════════════════
// AUTHENTICATED — SAVE FCM TOKEN
// ═══════════════════════════════════════════
exports.saveFcmToken = async (req, res) => {
  try {
    const token = req.body.token || req.body.fcmToken;

    if (!token || typeof token !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Missing token" });
    }

    try {
      await prisma.user.updateMany({
        where: { fcmToken: token, NOT: { id: req.user.id } },
        data: { fcmToken: null },
      });
    } catch (cleanupErr) {
      console.warn("FCM token cleanup warning:", cleanupErr.message);
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken: token },
    });

    res.json({ success: true, ok: true });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This device is already linked to another account",
      });
    }
    console.error("Save FCM error:", e);
    res
      .status(500)
      .json({ success: false, message: "Failed to save token" });
  }
};

// ═══════════════════════════════════════════
// ADMIN — GET ALL USERS
// ═══════════════════════════════════════════
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = {};
    if (role) where.role = String(role).toLowerCase();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true, 
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, count: users.length, data: users });
  } catch (e) {
    console.error("Get all users error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ═══════════════════════════════════════════
// ADMIN — UPDATE USER ROLE
// ═══════════════════════════════════════════
exports.updateUserRole = async (req, res) => {
  try {
    const role = String(req.body.role || "").toLowerCase();

    if (!["customer", "courier", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role" });
    }

    if (req.params.id === req.user.id && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot demote yourself",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (e) {
    if (e.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    console.error("Update role error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ═══════════════════════════════════════════
// ADMIN — DELETE USER
// ═══════════════════════════════════════════
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete yourself" });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: "User deleted" });
  } catch (e) {
    if (e.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    console.error("Delete user error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};