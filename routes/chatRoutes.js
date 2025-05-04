const express = require('express');
const router = express.Router();
const { getInbox, getMessages, sendMessage, createNewChat, archiveChat, renameChat, renderAdminView, getArchivedChats, unarchiveChat } = require('../controllers/chatController');
const { requireAuth, checkUser } = require('../middleware/authMiddleware');

// Apply auth middleware to all chat routes
router.use(requireAuth);
router.use(checkUser); // Ensure user info is available in res.locals.user

// GET chat inbox view
router.get('/', renderAdminView);

// GET archived chats for the current user
router.get('/archived', getArchivedChats);

// POST new chat
router.post('/new', createNewChat);

// GET messages for a specific chat
router.get('/messages/:chatId', getMessages);

// POST new message to a specific chat
router.post('/message/:chatId', sendMessage);

// PUT (update) to archive a specific chat for the current user
router.put('/:chatId/archive', archiveChat);

// PUT (update) to unarchive a specific chat for the current user
router.put('/:chatId/unarchive', unarchiveChat);

// PUT (update) to rename a specific group chat
router.put('/:chatId/rename', renameChat);

module.exports = router;
