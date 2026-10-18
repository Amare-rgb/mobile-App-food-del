const express = require('express');
const router = express.Router();
const orderController = require('../controller/order.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ─── Specific routes FIRST (must come before /:id) ───
router.get('/my', orderController.listMine);
router.get('/mine', orderController.listMine);
router.get('/pending/list', orderController.listPending);
router.get('/stats', orderController.getStats);
router.get('/all', orderController.listAll);

// ─── Create ───
router.post('/', orderController.create);

// ─── Dynamic routes LAST ───
router.get('/:id', orderController.getById);
router.post('/:id/accept', orderController.accept);

// Accept both PATCH and PUT for status updates
router.patch('/:id/status', orderController.updateStatus);
router.put('/:id/status', orderController.updateStatus);

// 🗑️ Delete Order (Admin Only)
router.delete('/:id', orderController.deleteOrder);

module.exports = router;