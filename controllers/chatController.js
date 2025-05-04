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
    const currentUserId = user._id; // Use consistent variable name
    const io = req.io; // Get io instance

    if (!user || !user._id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        // --- Check and Unarchive if necessary ---
        let chat = await Chat.findById(chatId).populate('users', '_id'); // Populate user IDs
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const archiveIndex = chat.archivedBy.findIndex(userId => userId.equals(currentUserId));
        if (archiveIndex > -1) {
            // User has archived this chat, unarchive it first
            chat.archivedBy.splice(archiveIndex, 1);
            // No need to save here, will be saved with timestamp update
            console.log(`[SERVER DEBUG] User ${currentUserId} sending message to archived chat ${chatId}. Unarchiving.`);
            // Emit unarchive event to the sender only
            io.to(currentUserId.toString()).emit('chatUnarchived', chat); // Send basic chat info
        }
        // --- End Check and Unarchive ---

        // Proceed with sending the message
        const message = new Message({
            chat: chatId,
            sender: currentUserId,
            content
        });
        await message.save();

        // --- Update Chat Timestamp ---
        // Ensure 'chat' is the latest version if it was modified during unarchive
        // Use findByIdAndUpdate to ensure atomicity if possible, or re-fetch if needed
        chat = await Chat.findByIdAndUpdate(
            chatId,
            { updatedAt: Date.now(), $pull: { archivedBy: currentUserId } }, // Also ensure unarchive persists
            { new: true }
        ).populate('users', '_id'); // Re-populate users after update

        if (!chat) {
            console.error(`[SERVER DEBUG] Failed to find chat ${chatId} after attempting timestamp update.`);
            // Handle error appropriately, maybe return 500
            return res.status(500).json({ error: 'Failed to update chat after sending message' });
        } else {
            console.log(`[SERVER DEBUG] Chat ${chatId} timestamp updated to ${chat.updatedAt}`);
        }
        // --- End Update Chat Timestamp ---


        const fullMessage = await message.populate('sender', 'username');

        // Emit only to the specific chat room
        // --- ADD THIS LOG ---
        console.log(`[SERVER DEBUG] Attempting to emit 'newMessage' to room: ${chatId}`);
        // --- END ADDED LOG ---
        io.to(chatId).emit('newMessage', fullMessage);

        // --- ADD: Trigger global unread check for OTHER participants ---
        if (chat.users && chat.users.length > 0) {
            chat.users.forEach(participant => {
                const participantIdString = participant._id.toString();
                // Don't trigger for the sender (their status is updated via updateLastViewed)
                if (participantIdString !== currentUserId.toString()) {
                    // --- ADD MORE DETAILED LOG ---
                    console.log(`[SERVER GLOBAL UNREAD TRIGGER] Emitting 'triggerGlobalUnreadCheck' to user room: ${participantIdString} due to new message in chat ${chatId} sent by ${currentUserId}`);
                    // --- END ADD ---
                    io.to(participantIdString).emit('triggerGlobalUnreadCheck');
                }
            });
        }
        // --- END ADD ---


        res.status(201).json(fullMessage);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Message not sent' });
    }
};

exports.renderAdminView = async (req, res) => {
    const user = res.locals.user;

    try {
        // Fetch chats for the user that they haven't archived
        const chats = await Chat.find({
            users: user._id,
            archivedBy: { $ne: user._id } // Filter out chats archived by the current user
        })
        .sort({ updatedAt: -1 }) // Sort by most recent activity
        .populate('users', 'username roles')
        .populate('creator', '_id');

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
            chats, // This list now excludes archived chats
            users
        });
    } catch (error) {
        console.error('Error rendering admin view:', error);
        res.status(500).send('Error rendering admin view');
    }
};

// Fetch chats archived by the current user
exports.getArchivedChats = async (req, res) => {
    const currentUserId = res.locals.user._id;

    try {
        const archivedChats = await Chat.find({
            users: currentUserId, // Ensure user is part of the chat
            archivedBy: currentUserId // Ensure chat is archived by this user
        })
        .sort({ updatedAt: -1 }) // Sort by most recent activity
        .populate('users', 'username roles') // Populate users for display
        .populate('creator', '_id'); // Populate creator if needed

        res.status(200).json(archivedChats);

    } catch (err) {
        console.error('Error fetching archived chats:', err);
        res.status(500).json({ error: 'Failed to fetch archived chats.' });
    }
};

exports.createNewChat = async (req, res) => {
    // --- Add Entry Log ---
    console.log('[!!!] ENTERING createNewChat function.');
    // --- End Entry Log ---

    console.log('[DEBUG] createNewChat called.');
    const { userIds, groupName } = req.body;
    const currentUserId = res.locals.user._id;
    console.log('[DEBUG] createNewChat - Request Body:', req.body);
    console.log('[DEBUG] createNewChat - Creator ID:', currentUserId);

    // --- Input Validation ---
    if (!userIds || !Array.isArray(userIds)) {
        console.error('[DEBUG] createNewChat - Error: userIds is missing or not an array.');
        return res.status(400).json({ error: 'User IDs must be provided as an array.' });
    }
    if (userIds.length === 0) {
        console.error('[DEBUG] createNewChat - Error: No users selected.');
        return res.status(400).json({ error: 'No users selected.' });
    }
    const uniqueOtherUserIds = [...new Set(userIds)]
        .map(id => id.toString())
        .filter(id => id !== currentUserId.toString());
    console.log('[DEBUG] createNewChat - Unique Other User IDs:', uniqueOtherUserIds);
    if (uniqueOtherUserIds.length === 0 && !groupName) {
        console.error('[DEBUG] createNewChat - Error: Cannot create chat with only self unless it\'s a named group.');
        return res.status(400).json({ error: 'Cannot create a chat with only yourself unless a group name is provided.' });
    }
    // --- End Input Validation ---

    // --- Check for req.io ---
    if (!req.io) {
        console.error('[CRITICAL] req.io is not available in createNewChat. Check server setup/middleware.');
        // Proceed but log the critical issue
    }
    // --- End check ---

    let populatedChat; // Define populatedChat outside the try block
    let operationDescription = 'initializing'; // <<< MOVE DECLARATION HERE

    try {
        console.log('[DEBUG] createNewChat - Entering try block.');
        let chat;
        // let operationDescription = 'initializing'; // <<< REMOVE FROM HERE
        let allParticipantIds;
        const isPotentiallyPrivate = uniqueOtherUserIds.length === 1 && !groupName;

        if (isPotentiallyPrivate) {
            // --- Private one-on-one chat ---
            console.log('[DEBUG] createNewChat - Handling private chat.');
            const otherUserId = uniqueOtherUserIds[0];
            allParticipantIds = [currentUserId.toString(), otherUserId]; // Ensure strings for query
            console.log('[DEBUG] createNewChat - Private chat participants:', allParticipantIds);

            console.log('[DEBUG] createNewChat - Finding existing private chat...');
            chat = await Chat.findOne({
                isGroupChat: false,
                users: { $all: allParticipantIds, $size: 2 }
            });

            if (!chat) {
                operationDescription = 'creating new private chat';
                console.log('[DEBUG] createNewChat - No existing private chat found. Creating new one...');
                chat = new Chat({
                    users: allParticipantIds,
                    creator: currentUserId,
                    isGroupChat: false
                });
                await chat.save();
                if (!chat) throw new Error('Failed to save new private chat.'); // Check after save
                console.log('[DEBUG] createNewChat - New private chat created:', chat._id);
            } else {
                operationDescription = 'unarchiving existing private chat';
                console.log('[DEBUG] createNewChat - Existing private chat found:', chat._id);
                // --- Unarchive for both participants if found ---
                const initialArchivedCount = chat.archivedBy.length;
                chat.archivedBy = chat.archivedBy.filter(userId => !allParticipantIds.includes(userId.toString()));
                if (chat.archivedBy.length < initialArchivedCount) {
                    await chat.save();
                    if (!chat) throw new Error('Failed to save unarchived private chat.'); // Check after save
                    console.log('[DEBUG] createNewChat - Unarchived existing private chat for participants.');
                }
                // --- End Unarchive ---
            }
            // --- End Private one-on-one chat ---

        } else {
            // --- Group chat or chat with self (if groupName is provided) ---
            console.log('[DEBUG] createNewChat - Creating group chat.');
            allParticipantIds = [currentUserId.toString(), ...uniqueOtherUserIds]; // Ensure strings
            console.log('[DEBUG] createNewChat - Group chat participants:', allParticipantIds);

            operationDescription = 'creating new group chat';
            chat = new Chat({
                groupName: groupName || 'Unnamed Group', // Use provided name or default
                users: allParticipantIds,
                creator: currentUserId,
                isGroupChat: true
            });
            await chat.save();
            if (!chat) throw new Error('Failed to save new group chat.'); // Check after save
            console.log('[DEBUG] createNewChat - New group chat created:', chat._id);
            // --- End Group chat ---
        }

        // --- Check if chat object is valid before populating ---
        if (!chat || !chat._id) {
             operationDescription = 'validating chat object before population';
             console.error('[ERROR] createNewChat - Chat object is invalid before population.');
             throw new Error('Chat creation or retrieval resulted in an invalid object.');
        }
        // --- End Check ---

        operationDescription = 'populating chat details';
        console.log('[DEBUG] createNewChat - Populating chat details...');
        // Populate the existing chat object directly
        populatedChat = await chat.populate([
            { path: 'users', select: 'username roles' },
            { path: 'creator', select: '_id' }
        ]);

        // --- Check if populatedChat is valid ---
        if (!populatedChat) {
            console.error(`[ERROR] createNewChat - Failed to populate chat details for chat ID: ${chat._id}.`);
            throw new Error('Failed to populate chat details after creation/retrieval.');
        }
        console.log('[DEBUG] createNewChat - Population complete.');
        // --- End Check ---

        // --- Emit to other participants ---
        operationDescription = 'emitting socket events';
        if (req.io) {
            const otherParticipantIds = populatedChat.users
                .map(user => user._id.toString())
                .filter(id => id !== currentUserId.toString());

            console.log(`[DEBUG] createNewChat - Emitting 'newChatCreated' to other participants: ${otherParticipantIds.join(', ')}`);
            otherParticipantIds.forEach(userId => {
                req.io.to(userId).emit('newChatCreated', populatedChat);
            });
        } else {
             console.warn('[DEBUG] createNewChat - req.io not available, skipping socket emission.');
        }
        // --- End Emit ---

        operationDescription = 'sending success response';
        console.log('[DEBUG] createNewChat - Sending success response.');
        // --- Add Pre-Response Log ---
        console.log('[!!!] Attempting to send 201 response.');
        // --- End Pre-Response Log ---
        res.status(201).json(populatedChat);
        // --- Add Post-Response Log ---
        console.log('[!!!] Successfully sent 201 response.');
        // --- End Post-Response Log ---

    } catch (err) {
        // --- Updated Error Logging ---
        console.error(`[ERROR] createNewChat - Error during operation: ${operationDescription}. Details:`, err);
        // --- Add Pre-Error Response Log ---
        console.log('[!!!] Attempting to send 500 response.');
        // --- End Pre-Error Response Log ---
        res.status(500).json({
            error: 'Failed to create or find chat.',
            operation: operationDescription,
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
         // --- Add Post-Error Response Log ---
         console.log('[!!!] Successfully sent 500 response.');
         // --- End Post-Error Response Log ---
    }
    // --- Add Exit Log ---
    console.log('[!!!] EXITING createNewChat function.');
    // --- End Exit Log ---
};

exports.archiveChat = async (req, res) => {
    const { chatId } = req.params;
    const currentUserId = res.locals.user._id;

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }

        // Authorization: Check if user is a participant
        const isParticipant = chat.users.some(userId => userId.equals(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not authorized to archive this chat.' });
        }

        // Add user to archivedBy array if not already present
        if (!chat.archivedBy.some(userId => userId.equals(currentUserId))) {
            chat.archivedBy.push(currentUserId);
            await chat.save();
            console.log(`[DEBUG] Chat ${chatId} archived by user ${currentUserId}.`);

            // --- Emit archive event ONLY to the user who archived ---
            // Use the user-specific room (assuming user ID is used as room name)
            console.log(`[DEBUG] Emitting chatArchived (${chatId}) to user room: ${currentUserId.toString()}`);
            req.io.to(currentUserId.toString()).emit('chatArchived', chatId);
            // --- End Emit ---

            res.status(200).json({ message: 'Chat archived successfully.' });
        } else {
            console.log(`[DEBUG] Chat ${chatId} was already archived by user ${currentUserId}.`);
            // Optionally emit event anyway to ensure client UI is consistent
            req.io.to(currentUserId.toString()).emit('chatArchived', chatId);
            res.status(200).json({ message: 'Chat was already archived.' });
        }

    } catch (err) {
        console.error('Error archiving chat:', err);
        res.status(500).json({ error: 'Failed to archive chat.' });
    }
};

exports.unarchiveChat = async (req, res) => {
    const { chatId } = req.params;
    const currentUserId = res.locals.user._id;

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }

        // Check if the user actually archived this chat
        const archiveIndex = chat.archivedBy.findIndex(userId => userId.equals(currentUserId));

        if (archiveIndex > -1) {
            // Remove user from archivedBy array
            chat.archivedBy.splice(archiveIndex, 1);
            await chat.save();
            console.log(`[DEBUG] Chat ${chatId} unarchived by user ${currentUserId}.`);

            // Populate the chat to send back to the client for adding to the main list
            const populatedChat = await chat.populate([
                { path: 'users', select: 'username roles' },
                { path: 'creator', select: '_id' }
            ]);

            // --- Emit unarchive event ONLY to the user who unarchived ---
            console.log(`[DEBUG] Emitting chatUnarchived (${chatId}) to user room: ${currentUserId.toString()}`);
            req.io.to(currentUserId.toString()).emit('chatUnarchived', populatedChat); // Send populated chat
            // --- End Emit ---

            res.status(200).json({ message: 'Chat unarchived successfully.', chat: populatedChat });
        } else {
            console.log(`[DEBUG] Chat ${chatId} was not archived by user ${currentUserId}.`);
            // Still return success, maybe the UI was out of sync
            const populatedChat = await chat.populate([
                { path: 'users', select: 'username roles' },
                { path: 'creator', select: '_id' }
            ]);
            req.io.to(currentUserId.toString()).emit('chatUnarchived', populatedChat); // Emit anyway for consistency
            res.status(200).json({ message: 'Chat was not archived by this user.', chat: populatedChat });
        }

    } catch (err) {
        console.error('Error unarchiving chat:', err);
        res.status(500).json({ error: 'Failed to unarchive chat.' });
    }
};

exports.renameChat = async (req, res) => {
    const { chatId } = req.params;
    const { groupName } = req.body;
    const currentUser = res.locals.user; // Get the full user object
    const currentUserId = currentUser._id;
    // --- Add Entry Log ---
    console.log(`[RENAME DEBUG] Entering renameChat for chat ${chatId} with name "${groupName}" by user ${currentUserId}`);

    if (!groupName || groupName.trim() === '') {
        console.log(`[RENAME DEBUG] Error: Group name cannot be empty.`);
        return res.status(400).json({ error: 'Group name cannot be empty.' });
    }

    try {
        // --- Log before findById ---
        console.log(`[RENAME DEBUG] Finding chat by ID: ${chatId}`);
        const chat = await Chat.findById(chatId);

        if (!chat) {
            console.log(`[RENAME DEBUG] Error: Chat not found.`);
            return res.status(404).json({ error: 'Chat not found.' });
        }
        // --- Log after findById ---
        console.log(`[RENAME DEBUG] Chat found. isGroupChat: ${chat.isGroupChat}`);

        if (!chat.isGroupChat) {
            console.log(`[RENAME DEBUG] Error: Not a group chat.`);
            return res.status(400).json({ error: 'Only group chats can be renamed.' });
        }

        // Authorization: Ensure the current user is part of the chat
        const isParticipant = chat.users.some(userId => userId.equals(currentUserId));
        console.log(`[RENAME DEBUG] Is user ${currentUserId} a participant? ${isParticipant}`);
        if (!isParticipant) {
            console.log(`[RENAME DEBUG] Error: User not authorized.`);
            return res.status(403).json({ error: 'You are not authorized to rename this chat.' });
        }

        chat.groupName = groupName.trim();
        // --- Log before save ---
        console.log(`[RENAME DEBUG] Attempting to save chat with new name: "${chat.groupName}"`);
        await chat.save();
        // --- Log after save ---
        console.log(`[RENAME DEBUG] Chat saved successfully.`);

        // Populate creator along with users before emitting
        // --- Log before populate ---
        console.log(`[RENAME DEBUG] Attempting to populate users and creator.`);
        const updatedChat = await chat.populate([
             { path: 'users', select: 'username roles' },
             { path: 'creator', select: '_id' } // Ensure creator is populated
        ]);
        // --- Log after populate ---
        if (!updatedChat) {
             console.error(`[RENAME ERROR] Failed to populate chat after saving!`);
             throw new Error('Population failed after saving chat.'); // Throw error to be caught
        }
        console.log(`[RENAME DEBUG] Population successful.`);
        // --- End Check ---

        // --- Create and Save System Message ---
        const systemMessageContent = `${currentUser.username} renamed the group to "${groupName.trim()}"`;
        const systemMessage = new Message({
            chat: chatId,
            sender: null, // Or a specific system user ID if you have one
            content: systemMessageContent,
            isSystemMessage: true // Flag to identify system messages
        });
        await systemMessage.save();
        console.log(`[RENAME DEBUG] System message saved for chat ${chatId}.`);
        // --- End Create and Save System Message ---


        // --- Emit rename event TO THE CHAT ROOM ---
        // const participantIds = updatedChat.users.map(user => user._id.toString()); // No longer needed for emit target
        // --- Log before emit ---
        console.log(`[RENAME DEBUG] Preparing to emit 'chatRenamed' to chat room: ${chatId}`);
        // participantIds.forEach(userId => { // Remove loop
        //     console.log(`[RENAME EMIT DEBUG] Emitting chatRenamed (${chatId}) to user room: ${userId}`);
        //     req.io.to(userId).emit('chatRenamed', updatedChat);
        // });
        req.io.to(chatId).emit('chatRenamed', updatedChat); // Emit to the chat room ID
        // --- Log after emit ---
        console.log(`[RENAME DEBUG] Finished emitting 'chatRenamed' to room ${chatId}.`);
        // --- End Emit rename event ---


        // --- Emit the NEW system message ---
        console.log(`[RENAME DEBUG] Preparing to emit 'newMessage' (system) to chat room: ${chatId}`);
        // We don't need to populate sender for system messages
        req.io.to(chatId).emit('newMessage', systemMessage.toObject()); // Send the plain object
        console.log(`[RENAME DEBUG] Finished emitting system 'newMessage' to room ${chatId}.`);
        // --- End Emit system message ---


        console.log(`[DEBUG] Chat ${chatId} renamed to "${groupName.trim()}" by user ${currentUserId}.`);
        // --- Log before sending response ---
        console.log(`[RENAME DEBUG] Sending 200 success response.`);
        res.status(200).json(updatedChat); // Send back the updated chat

    } catch (err) {
        // --- Log the caught error ---
        console.error('[RENAME ERROR] Error caught in renameChat:', err);
        res.status(500).json({ error: 'Failed to rename chat.', details: err.message });
    }
};

// --- ADD Member Management Controllers ---

// GET /chat/:chatId/members
exports.getChatMembersAndPotentialUsers = async (req, res) => {
    const { chatId } = req.params;
    const currentUserId = res.locals.user._id;

    try {
        const chat = await Chat.findById(chatId).populate('users', 'username roles');
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }
        if (!chat.isGroupChat) {
            return res.status(400).json({ error: 'Cannot manage members for non-group chats.' });
        }

        // Authorization: Ensure current user is a participant
        const isParticipant = chat.users.some(user => user._id.equals(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not authorized to view members of this chat.' });
        }

        const memberIds = chat.users.map(user => user._id);

        // Find potential users (Admin/Staff) who are NOT already members
        const potentialUsers = await User.find({
            roles: { $in: ['Admin', 'Staff'] },
            _id: { $nin: memberIds } // Exclude current members
        }).select('username roles');

        res.status(200).json({
            members: chat.users,
            potentialUsers,
            creatorId: chat.creator // Send creator ID for frontend logic
        });

    } catch (err) {
        console.error('[MEMBERS ERROR] Error fetching chat members:', err);
        res.status(500).json({ error: 'Failed to fetch chat members.', details: err.message });
    }
};

// PUT /chat/:chatId/members/add
exports.addChatMember = async (req, res) => {
    const { chatId } = req.params;
    const { userId: userIdToAdd } = req.body; // User ID to add
    const currentUser = res.locals.user; // User performing the action

    if (!userIdToAdd) {
        return res.status(400).json({ error: 'User ID to add is required.' });
    }

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }
        if (!chat.isGroupChat) {
            return res.status(400).json({ error: 'Cannot add members to non-group chats.' });
        }

        // Authorization: Any current participant can add (adjust if needed)
        const isParticipant = chat.users.some(id => id.equals(currentUser._id));
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not authorized to add members to this chat.' });
        }

        // Check if user to add exists and is valid
        const userToAdd = await User.findById(userIdToAdd);
        if (!userToAdd) {
            return res.status(404).json({ error: 'User to add not found.' });
        }

        // Check if user is already in the chat
        const alreadyMember = chat.users.some(id => id.equals(userIdToAdd));
        if (alreadyMember) {
            return res.status(400).json({ error: 'User is already a member of this chat.' });
        }

        // Add user
        chat.users.push(userIdToAdd);
        // Remove from archivedBy if the added user had previously archived it
        chat.archivedBy = chat.archivedBy.filter(id => !id.equals(userIdToAdd));
        // --- Explicitly update timestamp ---
        chat.updatedAt = Date.now();
        // --- End update timestamp ---
        await chat.save();

        // Populate for emitting events
        const updatedChat = await Chat.findById(chatId).populate([
            { path: 'users', select: 'username roles' },
            { path: 'creator', select: '_id' }
        ]);

        // Create and Save System Message
        const systemMessageContent = `${currentUser.username} added ${userToAdd.username}`;
        const systemMessage = new Message({
            chat: chatId,
            sender: null,
            content: systemMessageContent,
            isSystemMessage: true
        });
        await systemMessage.save();

        // Emit events
        if (req.io) {
            // Notify chat room about the new member and updated list
            req.io.to(chatId).emit('memberAdded', {
                chatId: chatId,
                addedUser: { _id: userToAdd._id, username: userToAdd.username, roles: userToAdd.roles },
                updatedMembers: updatedChat.users, // Send the full updated list
                creatorId: updatedChat.creator._id
            });
            // Emit the system message
            req.io.to(chatId).emit('newMessage', systemMessage.toObject());

            // --- ADD LOG before emitting to added user ---
            const targetRoom = userIdToAdd.toString();
            console.log(`[ADD MEMBER EMIT] Attempting to emit 'newChatCreated' for chat ${chatId} to target room: ${targetRoom}`);
            // --- END ADD LOG ---

            // Notify the added user so the chat appears in their list
            req.io.to(targetRoom).emit('newChatCreated', updatedChat); // Use newChatCreated
        }

        console.log(`[MEMBERS DEBUG] User ${currentUser.username} added ${userToAdd.username} to chat ${chatId}`);
        res.status(200).json({ message: 'Member added successfully.', updatedChat });

    } catch (err) {
        console.error('[MEMBERS ERROR] Error adding chat member:', err);
        res.status(500).json({ error: 'Failed to add member.', details: err.message });
    }
};

// PUT /chat/:chatId/members/remove
exports.removeChatMember = async (req, res) => {
    const { chatId } = req.params;
    const { userId: userIdToRemove } = req.body; // User ID to remove
    const currentUser = res.locals.user; // User performing the action

    if (!userIdToRemove) {
        return res.status(400).json({ error: 'User ID to remove is required.' });
    }
    if (currentUser._id.equals(userIdToRemove)) {
        return res.status(400).json({ error: 'You cannot remove yourself.' }); // Users should archive instead
    }

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }
        if (!chat.isGroupChat) {
            return res.status(400).json({ error: 'Cannot remove members from non-group chats.' });
        }

        // Authorization: Only creator can remove (adjust if Admins should too)
        if (!chat.creator.equals(currentUser._id)) {
             // Optional: Check if currentUser is Admin
             // const isAdmin = currentUser.roles.includes('Admin');
             // if (!isAdmin) {
                 return res.status(403).json({ error: 'Only the group creator can remove members.' });
             // }
        }

        // Check if user to remove is the creator
        if (chat.creator.equals(userIdToRemove)) {
            return res.status(400).json({ error: 'Cannot remove the group creator.' });
        }

        // Check if user to remove is actually in the chat
        const memberIndex = chat.users.findIndex(id => id.equals(userIdToRemove));
        if (memberIndex === -1) {
            return res.status(400).json({ error: 'User is not a member of this chat.' });
        }

        // Get username before removing
        const userToRemove = await User.findById(userIdToRemove).select('username');
        const usernameRemoved = userToRemove ? userToRemove.username : 'Unknown User';

        // Remove user
        chat.users.splice(memberIndex, 1);
        // Also remove from archivedBy list if they are there
        chat.archivedBy = chat.archivedBy.filter(id => !id.equals(userIdToRemove));
        // --- Explicitly update timestamp ---
        chat.updatedAt = Date.now();
        // --- End update timestamp ---
        await chat.save();

        // Populate for emitting events
         const updatedChat = await Chat.findById(chatId).populate([
            { path: 'users', select: 'username roles' },
            { path: 'creator', select: '_id' }
        ]);


        // Create and Save System Message
        const systemMessageContent = `${currentUser.username} removed ${usernameRemoved}`;
        const systemMessage = new Message({
            chat: chatId,
            sender: null,
            content: systemMessageContent,
            isSystemMessage: true
        });
        await systemMessage.save();

        // Emit events
        if (req.io) {
            // Notify chat room about the removed member and updated list
            req.io.to(chatId).emit('memberRemoved', {
                chatId: chatId,
                removedUserId: userIdToRemove,
                updatedMembers: updatedChat.users, // Send the full updated list
                creatorId: updatedChat.creator._id
            });
            // Emit the system message
            req.io.to(chatId).emit('newMessage', systemMessage.toObject());
            // Notify the removed user so they can remove the chat from their UI
            req.io.to(userIdToRemove.toString()).emit('chatRemovedFrom', chatId);
        }

        console.log(`[MEMBERS DEBUG] User ${currentUser.username} removed ${usernameRemoved} (ID: ${userIdToRemove}) from chat ${chatId}`);
        res.status(200).json({ message: 'Member removed successfully.', updatedChat });

    } catch (err) {
        console.error('[MEMBERS ERROR] Error removing chat member:', err);
        res.status(500).json({ error: 'Failed to remove member.', details: err.message });
    }
};

// --- END Member Management Controllers ---
