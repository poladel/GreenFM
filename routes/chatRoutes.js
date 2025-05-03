const express = require('express');
const router = express.Router();
const { getInbox, getMessages, sendMessage, createNewChat, deleteChat, renameChat, renderAdminView } = require('../controllers/chatController');
const { requireAuth, checkUser } = require('../middleware/authMiddleware');

// Apply auth middleware to all chat routes
router.use(requireAuth);
router.use(checkUser); // Ensure user info is available in res.locals.user

// GET chat inbox view
router.get('/', renderAdminView);

// POST new chat
router.post('/new', createNewChat);

// GET messages for a specific chat
router.get('/messages/:chatId', getMessages);

// POST new message to a specific chat
router.post('/message/:chatId', sendMessage);

// DELETE a specific chat
router.delete('/:chatId', deleteChat);

// PUT (update) to rename a specific group chat
router.put('/:chatId/rename', renameChat);

module.exports = router;
