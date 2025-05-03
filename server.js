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
    cors: { origin: '*' } // Adjust for production
});

// Share io instance across all requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
    console.log('🟢 Socket connected:', socket.id);

    // --- NEW: Join user-specific room based on JWT ---
    // Attempt to get token from auth payload or cookie
    const token = socket.handshake.auth?.token || socket.handshake.headers.cookie?.split('jwt=')[1]?.split(';')[0];
    let userEmail = null;
    let userId = null;
    let userRoles = [];

    if (token && process.env.ACCESS_TOKEN_SECRET) { // Check if token and secret exist
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            userId = decoded.id;
            // Fetch user details to get email and roles
            const user = await User.findById(userId).select('email roles').lean(); // Use lean for performance
            if (user) {
                userEmail = user.email;
                userRoles = user.roles || []; // Ensure roles is an array
                socket.join(userId); // Join room based on user ID (requires user ID to be string)
                console.log(`🔗 Socket ${socket.id} (User: ${userEmail}) joined room ${userId}`);

                // Join admin room if user is admin
                if (userRoles.includes('Admin')) {
                    socket.join('admin_room');
                    console.log(`🔗 Socket ${socket.id} (User: ${userEmail}) joined admin_room`);
                }
            } else {
                console.log(`⚠️ Socket ${socket.id}: User not found for token ID ${userId}`);
            }
        } catch (err) {
            console.log(`⚠️ Socket ${socket.id}: Invalid token - ${err.message}`);
        }
    } else {
        console.log(`⚠️ Socket ${socket.id}: No token or ACCESS_TOKEN_SECRET found.`);
    }
    // --- END NEW ---

    // Existing joinRoom logic (can be kept for other purposes)
    socket.on('joinRoom', roomId => {
        socket.join(roomId);
        // --- DEBUGGING START ---
        console.log(`[DEBUG] Socket ${socket.id} attempting to join room ${roomId}`);
        // You can add more checks here later if needed, e.g., verify roomId format
        // --- DEBUGGING END ---
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
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
app.get('*', checkUser);

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
app.use('/chat', chatRoutes);

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