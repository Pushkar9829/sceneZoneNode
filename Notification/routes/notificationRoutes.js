const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const notificationDebugController = require('../controller/notificationDebugController');
const {authMiddleware} = require('../../middlewares/authMiddleware');

// Save FCM token (for all user types)
router.post('/save-fcm-token', authMiddleware(['host', 'artist']), notificationController.saveFCMToken);

// Get user notifications (for all user types)
router.get('/', authMiddleware(['host', 'artist']), notificationController.getNotifications);

// Mark notification as read (for all user types)
router.patch('/:notificationId/read', authMiddleware(['host', 'artist']), notificationController.markAsRead);

// Mark all notifications as read (for all user types)
router.patch('/mark-all-read', authMiddleware(['host', 'artist']), notificationController.markAllAsRead);

// Get unread count (for all user types)
router.get('/unread-count', authMiddleware(['host', 'artist']), notificationController.getUnreadCount);

// Remove or deactivate FCM token (for all user types)
router.post('/remove-fcm-token', authMiddleware(['host', 'artist']), notificationController.removeFCMToken);

// Debug routes (for all user types)
router.get('/debug/health', authMiddleware(['host', 'artist']), notificationDebugController.debugNotificationHealth);
router.post('/debug/test', authMiddleware(['host', 'artist']), notificationDebugController.testNotification);
router.post('/debug/force-save-fcm', authMiddleware(['host', 'artist']), notificationDebugController.forceSaveFCMToken);
router.get('/debug/stats', authMiddleware(['host', 'artist']), notificationDebugController.getNotificationStats);
router.get('/debug/fcm-status', authMiddleware(['host', 'artist']), notificationDebugController.checkFCMTokenStatus);
router.get('/debug/event-assignment/:eventId', authMiddleware(['host', 'artist']), notificationDebugController.checkEventAssignment);

module.exports = router; 