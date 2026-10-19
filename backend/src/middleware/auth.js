const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT in `Authorization: Bearer <token>` and sets req.user.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice(7).trim(); // "Bearer " is exactly 7 chars

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Normalise the payload — supports both {id, role} and {userId, role}
    const id = payload.id ?? payload.userId ?? payload.sub;
    if (!id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.user = { id, role: payload.role };
    next();
  } catch (e) {
    // Don't leak details (expired vs. malformed)
    const message =
      e.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    console.error("Auth error:", e.message);
    return res.status(401).json({ error: message });
  }
};

/**
 * Optional: role guard. Use after authenticate:
 *   router.get("/admin", authenticate, requireRole("admin"), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

module.exports = { authenticate, requireRole };