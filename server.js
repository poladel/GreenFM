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

            // --- ADD: Emit success back to client ---
            console.log(`[SERVER AUTH] Emitting 'auth_success' to socket ${socket.id} for user ${userId}`);
            socket.emit('auth_success', { userId: userId });
            // --- END ADD ---

        } catch (error) {
            // console.error(`[SERVER JOIN ERROR] Error joining rooms for user ${userId} on socket ${socket.id}:`, error);
            // --- ADD: Emit failure back to client (optional but good practice) ---
            socket.emit('auth_failure', { error: 'Failed to join rooms' });
            // --- END ADD ---
        }
    });
    // --- End Authentication Handling ---


    // --- Handle Client Joining Specific Chat Rooms ---
    socket.on('joinRoom', async (roomId) => {
        // --- ADD: Handle specific live comments room ---
        if (roomId === 'live-comments-room') {
            try {
                socket.join(roomId);
                console.log(`[SERVER JOIN] Socket ${socket.id} (User: ${socket.userId || 'N/A'}) joined special room: ${roomId}`);
                console.log(`[SERVER ROOMS] Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
                return; // Exit early after joining the special room
            } catch (error) {
                console.error(`[SERVER JOIN ERROR] Error joining special room ${roomId} for socket ${socket.id}:`, error);
                return; // Exit on error
            }
        }
        // --- END ADD ---

        // --- Existing logic for chat room ObjectIds ---
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
             console.error(`[SERVER JOIN] Invalid chat roomId ('${roomId}') from socket ${socket.id}.`);
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
            console.log(`[SERVER JOIN] Socket ${socket.id} (User: ${socket.userId || 'N/A'}) joined chat room: ${roomId}`);
            console.log(`[SERVER ROOMS] Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
        } catch (error) {
            console.error(`[SERVER JOIN ERROR] Error joining chat room ${roomId} for socket ${socket.id}:`, error);
        }
    });
    // --- End Client Joining Chat Rooms ---

    // --- Handle Updating Last Viewed Timestamp ---
    socket.on('updateLastViewed', async (data) => {
        const { chatId } = data;
        const userId = socket.userId; // Get userId from the authenticated socket

        // --- ADD: Check if userId exists on socket ---
        if (!userId) {
            console.error(`[SERVER LAST VIEWED] Cannot update last viewed. User not authenticated on socket ${socket.id}. Data:`, data);
            return; // Stop if the socket isn't authenticated
        }
        // --- END ADD ---


        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            console.error(`[SERVER LAST VIEWED] Invalid data for updateLastViewed from socket ${socket.id}:`, { userId, chatId });
            return;
        }

        try {
            // --- Refined Update Logic ---
            const user = await User.findById(userId);
            if (!user) {
                console.error(`[SERVER LAST VIEWED] User not found for ID: ${userId}`);
                return;
            }

            // Ensure chatLastViewed exists and is a Map
            if (!user.chatLastViewed) {
                console.log(`[SERVER LAST VIEWED] Initializing chatLastViewed Map for user ${userId}.`);
                user.chatLastViewed = new Map();
            } else if (!(user.chatLastViewed instanceof Map)) {
                // Attempt to convert if it's a plain object (e.g., from older data)
                console.log(`[SERVER LAST VIEWED] chatLastViewed for user ${userId} is not a Map. Attempting conversion.`);
                try {
                    user.chatLastViewed = new Map(Object.entries(user.chatLastViewed));
                } catch (conversionError) {
                    console.error(`[SERVER LAST VIEWED] Could not convert chatLastViewed to Map for user ${userId}. Resetting.`, conversionError);
                    user.chatLastViewed = new Map(); // Reset if conversion fails
                }
            }

            // Update the map
            const updateTime = new Date();
            user.chatLastViewed.set(chatId.toString(), updateTime);
            console.log(`[SERVER LAST VIEWED] Attempting to save user ${userId} with chatLastViewed updated for chat ${chatId} at ${updateTime.toISOString()}`);
            await user.save(); // Save the entire user document
            console.log(`[SERVER LAST VIEWED] User ${userId} saved.`);
            // --- End Refined Update Logic ---

            // --- Verification Step ---
            const savedUser = await User.findById(userId).select('chatLastViewed');
            console.log(`[SERVER LAST VIEWED VERIFY] Re-fetched user ${userId}. chatLastViewed:`, savedUser?.chatLastViewed);
            // --- End Verification Step ---


            console.log(`[SERVER LAST VIEWED] Updated last viewed for user ${userId}, chat ${chatId}`);

            // Re-check global unread status for this user after update
            const userChats = await Chat.find({
                users: userId,
                archivedBy: { $ne: userId } // Exclude archived
            }).select('_id updatedAt').lean();

            // --- Use the re-fetched data ---
            const lastViewedMap = savedUser?.chatLastViewed || new Map();
            // --- End Use re-fetched data ---
            let hasUnread = false;
            console.log(`[SERVER LAST VIEWED RECHECK] Checking ${userChats.length} chats for user ${userId}. Map:`, lastViewedMap); // Log map used

            for (const chat of userChats) {
                const chatIdString = chat._id.toString();
                const lastViewedTime = lastViewedMap.get(chatIdString);
                const lastMessageTime = chat.updatedAt;

                // Ensure dates are valid before comparison
                const lastViewedDate = lastViewedTime instanceof Date ? lastViewedTime : new Date(0);
                const lastMessageDate = lastMessageTime instanceof Date ? lastMessageTime : new Date(0);

                // --- DETAILED LOGGING INSIDE LOOP (mirroring checkGlobalUnread) ---
                console.log(`[SERVER LAST VIEWED RECHECK] Chat: ${chatIdString}`);
                console.log(`  -> Last Message Time (Chat.updatedAt): ${lastMessageDate.toISOString()} (${lastMessageTime})`);
                console.log(`  -> Last Viewed Time (User.chatLastViewed): ${lastViewedDate.toISOString()} (${lastViewedTime})`);
                const isUnread = lastMessageDate > lastViewedDate;
                console.log(`  -> Comparison: ${lastMessageDate.toISOString()} > ${lastViewedDate.toISOString()} ? ${isUnread}`);
                // --- END DETAILED LOGGING ---

                if (isUnread) {
                    console.log(`  -> RESULT: UNREAD`);
                    hasUnread = true;
                    // break; // Keep break here for efficiency once an unread is found
                } else {
                     console.log(`  -> RESULT: READ`);
                }
            }
            console.log(`[SERVER LAST VIEWED] Re-checked unread status for user ${userId} after update: ${hasUnread}. Emitting 'updateGlobalUnread' TO ROOM ${userId}.`);
            io.to(userId).emit('updateGlobalUnread', { hasUnread: hasUnread });

        } catch (error) {
            console.error(`[SERVER LAST VIEWED] Error updating last viewed for user ${userId}, chat ${chatId}:`, error);
        }
    });
    // --- End Update Last Viewed ---


    // --- DETAILED LOGGING FOR checkGlobalUnread ---
    socket.on('checkGlobalUnread', async (data) => {
        const userId = socket.userId;
        // --- ADD LOG AT START ---
        console.log(`[SERVER IO] Received 'checkGlobalUnread' from socket ${socket.id} for user: ${userId}. Data received:`, data);
        // --- END ADD ---

        // --- ADD: Check if userId exists on socket ---
        if (!userId) {
            console.error(`[SERVER IO] Cannot check global unread. User not authenticated on socket ${socket.id}.`);
            return; // Stop if the socket isn't authenticated
        }
        // --- END ADD ---

        if (!mongoose.Types.ObjectId.isValid(userId)) { // Keep this check too
            console.error(`[SERVER IO] Invalid userId ('${userId}') on authenticated socket ${socket.id} for checkGlobalUnread.`);
            return;
        }

        try {
            const userChats = await Chat.find({
                users: userId,
                archivedBy: { $ne: userId }
            }).select('_id updatedAt').lean(); // Keep lean here for efficiency

            console.log(`[SERVER IO] Found ${userChats.length} active chats for user ${userId}.`);

            if (userChats.length === 0) {
                console.log(`[SERVER IO] No active chats found for user ${userId}. Emitting updateGlobalUnread: false TO ROOM ${userId}.`);
                // --- CHANGE: Emit to user's room ---
                io.to(userId).emit('updateGlobalUnread', { hasUnread: false });
                // --- END CHANGE ---
                return;
            }

            // --- Fetch full user document (removed .lean()) ---
            const user = await User.findById(userId).select('chatLastViewed');
            // --- Log the fetched user object ---
            console.log(`[SERVER IO] Fetched user object (no lean):`, user);
            console.log(`[SERVER IO] User's chatLastViewed field type: ${typeof user?.chatLastViewed}, instanceof Map: ${user?.chatLastViewed instanceof Map}`);

            // --- Simplified Map Handling (no lean) ---
            let lastViewedMap = (user && user.chatLastViewed instanceof Map) ? user.chatLastViewed : new Map();
            console.log(`[SERVER IO] User's last viewed map (from full document):`, lastViewedMap);
            // --- End Simplified Map Handling ---


            let hasUnread = false;
            for (const chat of userChats) {
                const chatIdString = chat._id.toString();
                const lastViewedTime = lastViewedMap.get(chatIdString);
                const lastMessageTime = chat.updatedAt;
                const lastViewedDate = lastViewedTime instanceof Date ? lastViewedTime : new Date(0);
                const lastMessageDate = lastMessageTime instanceof Date ? lastMessageTime : new Date(0);
                console.log(`[SERVER IO CHECK] Chat: ${chatIdString}`);
                console.log(`  -> Last Message Time (Chat.updatedAt): ${lastMessageDate.toISOString()} (${lastMessageTime})`);
                console.log(`  -> Last Viewed Time (User.chatLastViewed): ${lastViewedDate.toISOString()} (${lastViewedTime})`);
                const isUnread = lastMessageDate > lastViewedDate;
                console.log(`  -> Comparison: ${lastMessageDate.toISOString()} > ${lastViewedDate.toISOString()} ? ${isUnread}`);
                if (isUnread) {
                    console.log(`  -> RESULT: UNREAD`);
                    hasUnread = true;
                    // break; // Keep break commented out for full logging if needed
                } else {
                    console.log(`  -> RESULT: READ`);
                }
            }

            console.log(`[SERVER IO] Final unread status for user ${userId}: ${hasUnread}. Emitting 'updateGlobalUnread' TO ROOM ${userId}.`);
            // --- Emit to user's room (already changed in previous step) ---
            io.to(userId).emit('updateGlobalUnread', { hasUnread: hasUnread });
            // --- END Emit ---

        } catch (error) {
            console.error(`[SERVER IO] Error processing checkGlobalUnread for user ${userId} on socket ${socket.id}:`, error);
        }
    });
    // --- END DETAILED LOGGING ---

    // Existing disconnect logic
    socket.on('disconnect', (reason) => {
        console.log(`[SERVER IO] Socket disconnected: ${socket.id}. Reason: ${reason}. User ID was: ${socket.userId || 'N/A'}`);
    });

    // Existing newComment logic
    socket.on('newComment', async (data) => {
        const { text, username } = data;
        try {
            const comment = await Comment.create({ text, username });

            // Emit specifically to the live comments room
            io.to('live-comments-room').emit('newComment', {
                text: comment.text,
                username: comment.username,
                createdAt: comment.createdAt
            });

            console.log(`💬 [${username}] commented: ${text}`);
        } catch (err) {
            console.error('Error saving comment:', err.message);
            // Optionally, emit an error back to the sender
            // socket.emit('commentError', { message: 'Failed to save comment.' });
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