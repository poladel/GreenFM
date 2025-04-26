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

// Define your routes
const root = require('./routes/root');
const ApplicationPeriodRoutes = require('./routes/applicationPeriodRoutes');
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
//const adminSchedRoutes = require('./routes/adminSchedRoutes');
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');
const statusRoutes = require('./routes/statusRoutes');

app.get('*', checkUser);
app.use(root);
app.use(ApplicationPeriodRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use(authRoutes);
app.use(postRoutes);
app.use(joinBlocktimerRoutes);
app.use(staffSubmissionRoutes);
app.use(joinGFMRoutes);
app.use(uploadRoutes);
app.use('/playlist', playlistRoutes);
app.use(accountRoutes);
app.use(blocktimerRoutes);
app.use(schoolYearRoutes);
app.use(assessmentSlotRoutes);
//app.use(adminSchedRoutes);
app.use(contactRoutes);
app.use(manageRoutes);
app.use('/live', liveRoutes);
app.use(schedRoutes);
app.use('/', statusRoutes);

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
