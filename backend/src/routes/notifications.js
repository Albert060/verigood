const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  listForUser, unreadCount, markRead, markAllRead, deleteNotification,
} = require('../controllers/notificationsController');

const router = express.Router();

router.get('/notifications',                authenticate, listForUser);
router.get('/notifications/unread-count',   authenticate, unreadCount);
router.post('/notifications/read-all',      authenticate, markAllRead);
router.post('/notifications/:id/read',      authenticate, markRead);
router.delete('/notifications/:id',         authenticate, deleteNotification);

module.exports = router;
