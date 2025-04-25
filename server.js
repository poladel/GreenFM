require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/dbConn');
const corsOptions = require('./config/corsOptions');
const credentials = require('./middleware/credentials');
const cookieParser = require('cookie-parser');
const sessionMiddleware = require('./middleware/session');
const { checkUser } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// 🧠 MongoDB
mongoose.set('strictQuery', false);
connectDB();
mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));

// ✅ Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// ✅ Share io with all routes/controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ✅ Socket.IO setup
io.on('connection', socket => {
    console.log('🟢 Socket connected:', socket.id);

    socket.on('joinRoom', roomId => {
        socket.join(roomId);
        console.log(`🔗 Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// ✅ Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, '/public')));
app.set('view engine', 'ejs');

// ✅ Auth Middleware
app.use(checkUser);

// ✅ Routes
app.use(require('./routes/root'));
app.use(require('./routes/applicationPeriodRoutes'));
app.use(require('./routes/user-routes'));
app.use(require('./routes/admin-routes'));
app.use(require('./routes/authRoutes'));
app.use(require('./routes/postRoutes'));
app.use(require('./routes/joinGFMRoutes'));
app.use(require('./routes/joinBlocktimerRoutes'));
app.use(require('./routes/uploadRoutes'));
app.use('/playlist', require('./routes/playlistRoutes'));
app.use(require('./routes/accountRoutes'));
app.use(require('./routes/blocktimerRoutes'));
app.use(require('./routes/schoolYearRoutes'));
app.use(require('./routes/scheduleRoutes'));
app.use(require('./routes/assessmentSlotRoutes'));
app.use(require('./routes/contactRoutes'));
app.use(require('./routes/manageRoutes'));
app.use('/live', require('./routes/liveRoutes'));
app.use('/', require('./routes/statusRoutes'));
app.use('/chat', require('./routes/chatRoutes'));

// ✅ 404 Fallback
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

// ✅ Start server after DB is ready
mongoose.connection.once('open', () => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
});
