const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');

// GET all chats for logged in user
router.get('/', async (req, res) => {
  const userId = req.session.userId;
  const chats = await Chat.find({ members: userId }).lean();
  res.render('chat/chat', { chats, selectedChat: null, user: req.session.user });
});

// GET specific chat
router.get('/:id', async (req, res) => {
  const userId = req.session.userId;
  const chats = await Chat.find({ members: userId }).lean();
  const selectedChat = await Chat.findOne({ _id: req.params.id, members: userId })
    .populate('messages.sender', 'username')
    .lean();
  res.render('chat/chat', { chats, selectedChat, user: req.session.user });
});

// POST send message
router.post('/send/:id', async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  chat.messages.push({
    sender: req.session.userId,
    text: req.body.message
  });
  await chat.save();
  res.redirect('/chat/' + req.params.id); // reload page after send
});

module.exports = router;
