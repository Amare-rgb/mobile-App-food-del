const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// ═══════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════
router.post('/signup', authController.signup);
router.post('/register', authController.signup); // Alias for frontend
router.post('/login', authController.login);

// ═══════════════════════════════════════════
// AUTHENTICATED — profile
// ═══════════════════════════════════════════
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, authController.updateProfile);

// Settings screen uses these:
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);

// Avatar upload
router.post(
  '/avatar',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file' });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      return res.json({ url });
    } catch (e) {
      console.error('avatar upload error:', e);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// FCM token
router.post('/fcm-token', authenticate, authController.saveFcmToken);

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════
router.get('/users', authenticate, authController.getAllUsers);
router.put('/users/:id/role', authenticate, authController.updateUserRole);
router.delete('/users/:id', authenticate, authController.deleteUser);

module.exports = router;