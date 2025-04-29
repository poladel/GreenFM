const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

exports.getInbox = async (req, res) => {
    const userId = req.user._id;

    try {
        const chats = await Chat.find({ users: userId }).populate('users');
        res.render('1-admin/4-chat', {
            chats,
            user: req.user,
            pageTitle: 'Chat',
            cssFile: 'css/chat.css',
            headerTitle: 'CHAT'
        });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).send('Error fetching chats');
    }
};

exports.getMessages = async (req, res) => {
    const { chatId } = req.params;
    try {
        const messages = await Message.find({ chat: chatId }).populate('sender');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send('Error fetching messages');
    }
};

exports.sendMessage = async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body;
    const user = req.user || res.locals.user;

    console.log('Sending message to chat:', chatId);
    console.log('Message content:', content);
    console.log('User sending message:', user);

    if (!user || !user._id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const message = new Message({
            chat: chatId,
            sender: user._id,
            content
        });
        await message.save();

        const fullMessage = await message.populate('sender', 'username');
        req.io.to(chatId).emit('newMessage', fullMessage);

        res.status(201).json(fullMessage);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Message not sent' });
    }
};

exports.renderAdminView = async (req, res) => {
    const user = res.locals.user;

    try {
        // Fetch chats and users for the admin view
        const chats = await Chat.find({ users: user._id }).populate('users');
        const users = await User.find({
            roles: { $in: ['Admin', 'Staff'] },
            _id: { $ne: user._id }
        });

        res.render('1-admin/4-chat', {
            pageTitle: 'Chat',
            cssFile: 'css/chat.css',
            user,
            headerTitle: 'CHAT',
            currentPath: req.path,
            chats,
            users
        });
    } catch (error) {
        console.error('Error rendering admin view:', error);
        res.status(500).send('Error rendering admin view');
    }
};

exports.createNewChat = async (req, res) => {
    const { userIds, groupName } = req.body;
    const currentUserId = res.locals.user._id;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ error: 'No users selected.' });
    }

    try {
        let chat;

        if (userIds.length === 1 && !groupName) {
            // Private one-on-one chat
            const userId = userIds[0];

            chat = await Chat.findOne({
                isGroupChat: false,
                users: { $all: [currentUserId, userId], $size: 2 }
            });

            if (!chat) {
                chat = await Chat.create({
                    isGroupChat: false,
                    users: [currentUserId, userId]
                });
            }
        } else {
            // Group chat
            const allUserIds = [...userIds, currentUserId]; // add self

            chat = await Chat.create({
                isGroupChat: true,
                users: allUserIds,
                groupName: groupName || 'New Group'
            });
        }

        const populatedChat = await chat.populate('users', 'username');
        res.status(201).json(populatedChat);

    } catch (err) {
        console.error('Error creating chat:', err);
        res.status(500).json({ error: 'Failed to create chat' });
    }
};
