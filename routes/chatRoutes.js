const express = require('express');
const router = express.Router();
const { getInbox, getMessages, sendMessage, createNewChat } = require('../controllers/chatController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getInbox);
router.get('/messages/:chatId', requireAuth, getMessages);
router.post('/new', requireAuth, createNewChat);
router.post('/message/:chatId', requireAuth, sendMessage);

module.exports = router;
