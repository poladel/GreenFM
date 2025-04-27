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
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const joinGFMRoutes = require('./routes/joinGFMRoutes');
const staffSubmissionRoutes = require('./routes/staffSubmissionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const accountRoutes = require('./routes/accountRoutes');
const blocktimerRoutes = require('./routes/blocktimerRoutes');
const schoolYearRoutes = require('./routes/schoolYearRoutes');
const schedRoutes = require('./routes/scheduleRoutes');
const assessmentSlotRoutes = require('./routes/assessmentSlotRoutes');
// const adminSchedRoutes = require('./routes/adminSchedRoutes'); // Uncomment if needed
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');
const statusRoutes = require('./routes/statusRoutes');
const chatRoutes = require('./routes/chatRoutes');
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
    cors: { origin: '*' }
});

// Share io instance across all requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.IO connection handling
io.on('connection', socket => {
    console.log('🟢 Socket connected:', socket.id);

    socket.on('joinRoom', roomId => {
        socket.join(roomId);
        console.log(`🔗 Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });

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
app.use(joinBlocktimerRoutes);
app.use(joinGFMRoutes);
app.use(staffSubmissionRoutes);
app.use(uploadRoutes);
app.use('/playlist', playlistRoutes);
app.use(accountRoutes);
app.use(blocktimerRoutes);
app.use(schoolYearRoutes);
app.use(schedRoutes);
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
