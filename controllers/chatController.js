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

        // --- TEMPORARY DEBUGGING CHANGE ---
        // req.io.to(chatId).emit('newMessage', fullMessage); // Original line
        console.log(`[DEBUG] Broadcasting message globally instead of to room ${chatId}`);
        req.io.emit('newMessage', fullMessage); // Broadcast to ALL connected clients
        // --- END TEMPORARY CHANGE ---


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
    const currentUserId = res.locals.user._id; // Creator's ID

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ error: 'No users selected.' });
    }

    // Ensure userIds are distinct and don't include the creator initially for easier logic
    const uniqueOtherUserIds = [...new Set(userIds)].filter(id => id.toString() !== currentUserId.toString());

    if (uniqueOtherUserIds.length === 0 && !groupName) {
        // Trying to create a private chat with only self? Or group chat with only self?
        return res.status(400).json({ error: 'Cannot create a chat with only yourself.' });
    }

    try {
        let chat;
        let allParticipantIds; // To store all IDs including the creator

        if (uniqueOtherUserIds.length === 1 && !groupName) {
            // Private one-on-one chat
            const otherUserId = uniqueOtherUserIds[0];
            allParticipantIds = [currentUserId, otherUserId];

            chat = await Chat.findOne({
                isGroupChat: false,
                users: { $all: allParticipantIds, $size: 2 }
            });

            if (!chat) {
                chat = await Chat.create({
                    isGroupChat: false,
                    users: allParticipantIds
                });
            }
        } else {
            // Group chat
            allParticipantIds = [currentUserId, ...uniqueOtherUserIds]; // Add creator back

            chat = await Chat.create({
                isGroupChat: true,
                users: allParticipantIds,
                groupName: groupName || 'New Group' // Default group name if empty
            });
        }

        const populatedChat = await chat.populate('users', 'username roles'); // Populate roles too

        // --- Emit to other participants ---
        if (populatedChat) {
            allParticipantIds.forEach(userId => {
                // Don't emit back to the creator, their client handles it
                if (userId.toString() !== currentUserId.toString()) {
                    console.log(`[DEBUG] Emitting newChatCreated to user room: ${userId}`);
                    req.io.to(userId.toString()).emit('newChatCreated', populatedChat);
                }
            });
        }
        // --- End Emit ---

        res.status(201).json(populatedChat);

    } catch (err) {
        console.error('Error creating chat:', err);
        res.status(500).json({ error: 'Failed to create chat' });
    }
};

exports.deleteChat = async (req, res) => {
    const { chatId } = req.params;
    const currentUserId = res.locals.user._id;

    try {
        const chat = await Chat.findById(chatId).populate('users', '_id'); // Populate only IDs needed for emit

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }

        // Authorization: Ensure the current user is part of the chat
        const isParticipant = chat.users.some(user => user._id.equals(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not authorized to delete this chat.' });
        }

        // --- Emit deletion event BEFORE deleting ---
        // This ensures participants are notified even if subsequent steps fail slightly
        const participantIds = chat.users.map(user => user._id.toString());
        participantIds.forEach(userId => {
            console.log(`[DEBUG] Emitting chatDeleted (${chatId}) to user room: ${userId}`);
            req.io.to(userId).emit('chatDeleted', chatId);
        });
        // --- End Emit ---

        // Delete the chat document
        await Chat.findByIdAndDelete(chatId);

        // Optional: Delete associated messages (consider performance implications for large chats)
        // await Message.deleteMany({ chat: chatId });
        // console.log(`[DEBUG] Deleted messages for chat ${chatId}`);

        console.log(`[DEBUG] Chat ${chatId} deleted successfully by user ${currentUserId}.`);
        res.status(200).json({ message: 'Chat deleted successfully.' });

    } catch (err) {
        console.error('Error deleting chat:', err);
        res.status(500).json({ error: 'Failed to delete chat.' });
    }
};

exports.renameChat = async (req, res) => {
    const { chatId } = req.params;
    const { groupName } = req.body;
    const currentUserId = res.locals.user._id;

    if (!groupName || groupName.trim() === '') {
        return res.status(400).json({ error: 'Group name cannot be empty.' });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }

        if (!chat.isGroupChat) {
            return res.status(400).json({ error: 'Only group chats can be renamed.' });
        }

        // Authorization: Ensure the current user is part of the chat
        const isParticipant = chat.users.some(userId => userId.equals(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not authorized to rename this chat.' });
        }

        chat.groupName = groupName.trim();
        await chat.save();

        // Populate users before emitting
        const updatedChat = await chat.populate('users', 'username roles');

        // --- Emit rename event ---
        const participantIds = updatedChat.users.map(user => user._id.toString());
        participantIds.forEach(userId => {
            console.log(`[DEBUG] Emitting chatRenamed (${chatId}) to user room: ${userId}`);
            req.io.to(userId).emit('chatRenamed', updatedChat);
        });
        // --- End Emit ---

        console.log(`[DEBUG] Chat ${chatId} renamed to "${groupName.trim()}" by user ${currentUserId}.`);
        res.status(200).json(updatedChat); // Send back the updated chat

    } catch (err) {
        console.error('Error renaming chat:', err);
        res.status(500).json({ error: 'Failed to rename chat.' });
    }
};
