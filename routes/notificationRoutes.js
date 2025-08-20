const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, NotificationController.getUserNotifications);

router.put('/:id/read', authenticateToken, NotificationController.markAsRead);

router.put('/read-all', authenticateToken, NotificationController.markAllAsRead);

router.get('/unread-count', authenticateToken, NotificationController.getUnreadCount);

module.exports = router;

