// Load environment variables
require('dotenv').config();

// Core modules
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Chat = require('./models/Chat'); // Ensure Chat model is required

// Custom modules
const connectDB = require('./config/dbConn');
const corsOptions = require('./config/corsOptions');
const credentials = require('./middleware/credentials');
const sessionMiddleware = require('./middleware/session');
const { checkUser } = require('./middleware/authMiddleware');

// Route imports
const root = require('./routes/root');
const applicationPeriodRoutes = require('./routes/ApplicationPeriodRoutes');
const userRoutes = require('./routes/user-routes');
const adminRoutes = require('./routes/admin-routes');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const joinGFMRoutes = require('./routes/joinGFMRoutes');
const staffSubmissionRoutes = require('./routes/staffSubmissionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const accountRoutes = require('./routes/accountRoutes');
const blocktimerRoutes = require('./routes/blocktimerRoutes');
const schoolYearRoutes = require('./routes/schoolYearRoutes');
const schedRoutes = require('./routes/scheduleRoutes');
const assessmentPeriodRoutes = require('./routes/assessmentPeriodRoutes');
const assessmentSlotRoutes = require('./routes/assessmentSlotRoutes');
// const adminSchedRoutes = require('./routes/adminSchedRoutes'); // Uncomment if needed
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');
const statusRoutes = require('./routes/statusRoutes');
const chatRoutes = require('./routes/chatRoutes');
const forumRoutes = require('./routes/ForumRoutes');
const Comment = require('./models/Comment');

// App setup
const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
mongoose.set('strictQuery', false);
connectDB();
mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));

// HTTP server and Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions // Use your CORS options here too
});

// --- IMPORTANT: Make io accessible to routes ---
// This middleware attaches io to each request object
app.use((req, res, next) => {
    // --- Add Logging ---
    // console.log(`[Middleware] Attaching io for request: ${req.method} ${req.originalUrl}`);
    // --- End Logging ---
    req.io = io;
    next();
});
// --- End io attachment ---

// Socket.IO connection handling
io.on('connection', (socket) => {
    // console.log(`[SERVER IO] Socket connected: ${socket.id}`);

    // --- Handle Authentication and Room Joining ---
    socket.on('authenticate', async (userId) => {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            // console.error(`[SERVER AUTH] Invalid userId ('${userId}') received from socket ${socket.id}. Disconnecting.`);
            socket.disconnect(true); // Disconnect invalid connections
            return;
        }

        // Store userId on the socket object
        socket.userId = userId;
        // console.log(`[SERVER AUTH] Socket ${socket.id} authenticated for user ${userId}`);

        try {
            // Join user-specific room
            socket.join(userId);
            // console.log(`[SERVER JOIN] Socket ${socket.id} joined user room: ${userId}`);

            // Fetch roles and join admin room if applicable
            const user = await User.findById(userId).select('roles').lean();
            if (user && user.roles && user.roles.includes('Admin')) {
                socket.join('admin_room');
                // console.log(`[SERVER JOIN] Socket ${socket.id} (Admin) joined admin_room`);
            }
            // console.log(`[SERVER ROOMS] Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));

        } catch (error) {
            // console.error(`[SERVER JOIN ERROR] Error joining rooms for user ${userId} on socket ${socket.id}:`, error);
        }
    });
    // --- End Authentication Handling ---


    // --- Handle Client Joining Specific Chat Rooms ---
    socket.on('joinRoom', async (roomId) => {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
             console.error(`[SERVER JOIN] Invalid roomId ('${roomId}') from socket ${socket.id}.`);
             return;
        }
        // Optional: Verify user has access to this room before joining
        // const hasAccess = await checkUserAccessToChat(socket.userId, roomId);
        // if (!hasAccess) {
        //     console.warn(`[SERVER JOIN] User ${socket.userId} denied access to room ${roomId}.`);
        //     return;
        // }

        try {
            socket.join(roomId);
            // console.log(`[SERVER JOIN] Socket ${socket.id} (User: ${socket.userId || 'N/A'}) joined chat room: ${roomId}`);
            // console.log(`[SERVER ROOMS] Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
        } catch (error) {
            console.error(`[SERVER JOIN ERROR] Error joining chat room ${roomId} for socket ${socket.id}:`, error);
        }
    });
    // --- End Client Joining Chat Rooms ---

    // --- Handle Updating Last Viewed Timestamp ---
    socket.on('updateLastViewed', async (data) => {
        const { chatId } = data;
        const userId = socket.userId; // Get userId from the authenticated socket

        if (!userId || !chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            console.error(`[SERVER LAST VIEWED] Invalid data for updateLastViewed from socket ${socket.id}:`, { userId, chatId });
            return;
        }

        try {
            const updatePath = `chatLastViewed.${chatId}`;
            await User.findByIdAndUpdate(userId, { $set: { [updatePath]: new Date() } });
            // console.log(`[SERVER LAST VIEWED] Updated last viewed for user ${userId}, chat ${chatId}`);

            // Optional: Re-check global unread status for this user after update
            // (This ensures the dot hides immediately if this was the last unread chat)
            // Find chats where the user is a member
            const userChats = await Chat.find({ users: userId }).select('_id updatedAt').lean();
            const user = await User.findById(userId).select('chatLastViewed').lean();
            const lastViewedMap = user?.chatLastViewed || new Map();
            let hasUnread = false;
            for (const chat of userChats) {
                const chatIdString = chat._id.toString();
                const lastViewedTime = lastViewedMap instanceof Map ? lastViewedMap.get(chatIdString) : lastViewedMap[chatIdString];
                const lastMessageTime = chat.updatedAt;
                const lastViewedDate = lastViewedTime ? new Date(lastViewedTime) : new Date(0);
                const lastMessageDate = lastMessageTime ? new Date(lastMessageTime) : new Date(0);
                if (lastMessageDate > lastViewedDate) {
                    hasUnread = true;
                    break;
                }
            }
            // console.log(`[SERVER LAST VIEWED] Re-checked unread status for user ${userId}: ${hasUnread}. Emitting 'updateGlobalUnread'.`);
            socket.emit('updateGlobalUnread', { hasUnread: hasUnread });

        } catch (error) {
            console.error(`[SERVER LAST VIEWED] Error updating last viewed for user ${userId}, chat ${chatId}:`, error);
        }
    });
    // --- End Update Last Viewed ---


    // --- DETAILED LOGGING FOR checkGlobalUnread ---
    socket.on('checkGlobalUnread', async (data) => {
        // Use socket.userId established during authentication
        const userId = socket.userId;
        // console.log(`[SERVER IO] Received 'checkGlobalUnread' from socket ${socket.id} for user: ${userId}`);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            // This check might be redundant if authentication disconnects invalid users, but good for safety
            console.error(`[SERVER IO] Invalid or missing userId ('${userId}') on authenticated socket ${socket.id} for checkGlobalUnread.`);
            return;
        }

        try {
            // Find chats where the user is a member AND not archived for this user
            // Assuming 'archivedBy' is an array of user IDs who archived the chat
            const userChats = await Chat.find({
                users: userId,
                archivedBy: { $ne: userId } // Exclude chats archived by the user
            }).select('_id updatedAt').lean();

            // console.log(`[SERVER IO] Found ${userChats.length} active chats for user ${userId}.`);

            if (userChats.length === 0) {
                console.log(`[SERVER IO] No active chats found for user ${userId}. Emitting updateGlobalUnread: false.`);
                socket.emit('updateGlobalUnread', { hasUnread: false });
                return;
            }

            // Fetch last viewed times
            const user = await User.findById(userId).select('chatLastViewed').lean();
            // Ensure lastViewedMap is treated as a plain object if not a Map
            const lastViewedData = user?.chatLastViewed;
            let lastViewedMap = {};
            if (lastViewedData instanceof Map) {
                lastViewedMap = Object.fromEntries(lastViewedData);
            } else if (typeof lastViewedData === 'object' && lastViewedData !== null) {
                lastViewedMap = lastViewedData; // Assume it's already a plain object
            }

            // console.log(`[SERVER IO] User's last viewed map:`, lastViewedMap);

            let hasUnread = false;
            for (const chat of userChats) {
                const chatIdString = chat._id.toString();
                const lastViewedTime = lastViewedMap[chatIdString]; // Access as plain object property
                const lastMessageTime = chat.updatedAt;

                const lastViewedDate = lastViewedTime ? new Date(lastViewedTime) : new Date(0);
                const lastMessageDate = lastMessageTime ? new Date(lastMessageTime) : new Date(0);

                if (lastMessageDate > lastViewedDate) {
                    // console.log(`[SERVER IO] Chat ${chatIdString} is UNREAD for user ${userId}. Last message: ${lastMessageDate.toISOString()}, Last viewed: ${lastViewedDate.toISOString()}`);
                    hasUnread = true;
                    break;
                } else {
                     console.log(`[SERVER IO] Chat ${chatIdString} is READ for user ${userId}. Last message: ${lastMessageDate.toISOString()}, Last viewed: ${lastViewedDate.toISOString()}`);
                }
            }

            // console.log(`[SERVER IO] Final unread status for user ${userId}: ${hasUnread}. Emitting 'updateGlobalUnread' to socket ${socket.id}.`);
            socket.emit('updateGlobalUnread', { hasUnread: hasUnread });

        } catch (error) {
            console.error(`[SERVER IO] Error processing checkGlobalUnread for user ${userId} on socket ${socket.id}:`, error);
        }
    });
    // --- END DETAILED LOGGING ---

    // --- Refine newMessage Handling ---
    // This might live in chatController or directly here. Ensure it uses user-specific rooms.
    // Example if handled directly in server.js:
    socket.on('clientSendMessage', async (data) => { // Assuming client emits 'clientSendMessage'
        const { chatId, content /* other fields */ } = data;
        const senderId = socket.userId; // Get sender from authenticated socket

        if (!senderId || !chatId || !content) {
            console.error(`[SERVER IO - clientSendMessage] Invalid message data from socket ${socket.id}:`, data);
            // Optionally emit an error back to sender
            return;
        }

        // console.log(`[SERVER IO - clientSendMessage] Received message for chat ${chatId} from user ${senderId}`);

        try {
            // 1. Save the message (replace with your actual saving logic)
            // const savedMessage = await saveMessageFunction({ chatId, senderId, content });
            // const populatedMessage = await populateMessageFunction(savedMessage);
            const populatedMessage = { // Placeholder
                 _id: new mongoose.Types.ObjectId(),
                 chat: chatId,
                 sender: { _id: senderId, username: 'User' /* other sender fields */ },
                 content: content,
                 createdAt: new Date(),
                 updatedAt: new Date(), // Ensure updatedAt is set
                 isSystemMessage: false,
                 toObject: function() { return this; } // Mock toObject for consistency
            };

            // 2. Emit to the chat room
            const targetRoom = chatId.toString();
            // console.log(`[SERVER IO EMIT] Attempting to emit 'newMessage' to room: ${targetRoom}`);
            const socketsInRoom = await io.in(targetRoom).allSockets();
            // console.log(`[SERVER IO EMIT] Sockets currently in room ${targetRoom}:`, Array.from(socketsInRoom));
            io.to(targetRoom).emit('newMessage', populatedMessage.toObject());
            // console.log(`[SERVER IO EMIT] Successfully emitted 'newMessage' to room ${targetRoom}.`);

            // 3. Trigger global unread check for recipients
            const chat = await Chat.findById(targetRoom).select('users').lean();
            if (chat && chat.users) {
                chat.users.forEach(userId => {
                    const userIdString = userId.toString();
                    if (userIdString !== senderId) { // Don't notify the sender
                        // console.log(`[SERVER IO TRIGGER] Emitting 'triggerGlobalUnreadCheck' to user room: ${userIdString}`);
                        io.to(userIdString).emit('triggerGlobalUnreadCheck'); // Emit to user-specific room
                    }
                });
            }

        } catch (error) {
            console.error('[SERVER IO ERROR] Failed to process or emit clientSendMessage:', error);
            // Optionally emit an error back to sender
        }
    });
    // --- End refine newMessage Handling ---


    // Existing disconnect logic
    socket.on('disconnect', (reason) => {
        console.log(`[SERVER IO] Socket disconnected: ${socket.id}. Reason: ${reason}. User ID was: ${socket.userId || 'N/A'}`);
    });

    // Existing newComment logic
    socket.on('newComment', async (data) => {
        const { text, username } = data;
        try {
            const comment = await Comment.create({ text, username });
            
            io.to('live-comments-room').emit('newComment', {
                text: comment.text,
                username: comment.username,
                createdAt: comment.createdAt
            });
    
            console.log(`💬 [${username}] commented: ${text}`);
        } catch (err) {
            console.error('Error saving comment:', err.message);
        }
    });

});

// Conditionally trust the proxy only in production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust the first hop from the proxy
    console.log("Trusting proxy in production environment.");
}


// Middleware
app.use(credentials); // Handle credentials for CORS
app.use(cors(corsOptions)); // Enable CORS with options
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(sessionMiddleware); // Session management

// Static files
app.use(express.static(path.join(__dirname, '/public')));

// View engine
app.set('view engine', 'ejs');

// Auth Middleware applied globally
app.get('*', checkUser); // Ensure this doesn't interfere unexpectedly

// Routes
app.use(root);
app.use(applicationPeriodRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use(authRoutes);
app.use(postRoutes);
app.use('/', archiveRoutes);
app.use(joinBlocktimerRoutes);
app.use(joinGFMRoutes);
app.use(staffSubmissionRoutes);
app.use(uploadRoutes);
app.use('/', forumRoutes); // ADD HERE - Group with other routes
app.use('/playlist', playlistRoutes);
app.use(accountRoutes);
app.use(blocktimerRoutes);
app.use(schoolYearRoutes);
app.use(schedRoutes);
app.use(assessmentPeriodRoutes);
app.use(assessmentSlotRoutes);
// app.use(adminSchedRoutes); // Uncomment if needed
app.use(contactRoutes);
app.use(manageRoutes);
app.use('/live', liveRoutes);
app.use('/', statusRoutes);
app.use('/chat', chatRoutes); // Ensure chatRoutes is used *after* the req.io middleware

// 404 Fallback
app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404', { title: 'Page Not Found' });
    } else if (req.accepts('json')) {
        res.json({ error: '404 Not Found' });
    } else {
        res.type('txt').send('404 Not Found');
    }
});



// Start server after MongoDB is ready
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Current NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`); // Log the environment
    });
});