require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const credentials = require('./middleware/credentials');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const cookieParser = require('cookie-parser');
const sessionMiddleware = require('./middleware/session');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(credentials);
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Connecting to MongoDB Atlas
mongoose.set('strictQuery', false);
connectDB();

// Serve static files from 'public', 'user', and 'admin' directories
app.use(express.static(path.join(__dirname, '/public')));

// Register view engine
app.set('view engine', 'ejs');

// Define your routes
const root = require('./routes/root');
const ApplicationPeriodRoutes = require('./routes/ApplicationPeriodRoutes');
const userRoutes = require('./routes/user-routes');
const adminRoutes = require('./routes/admin-routes');
const authRoutes = require('./routes/authRoutes');
const { checkUser } = require('./middleware/authMiddleware');
const postRoutes = require('./routes/postRoutes');
const joinGFMRoutes = require('./routes/joinGFMRoutes');
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const accountRoutes = require('./routes/accountRoutes');
const blocktimerRoutes = require('./routes/blocktimerRoutes');
const schoolYearRoutes = require('./routes/schoolYearRoutes');
const schedRoutes = require('./routes/scheduleRoutes');
const adminSchedRoutes = require('./routes/adminSchedRoutes');
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');

app.get('*', checkUser);
app.use(root);
app.use(ApplicationPeriodRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use(authRoutes);
app.use(postRoutes);
app.use(joinGFMRoutes);
app.use(joinBlocktimerRoutes);
app.use(uploadRoutes);
app.use('/playlist', playlistRoutes);
app.use(accountRoutes);
app.use(blocktimerRoutes);
app.use(schoolYearRoutes);
app.use(adminSchedRoutes);
app.use(contactRoutes);
app.use(manageRoutes);
app.use('/live', liveRoutes);
app.use(schedRoutes);

// 404 Handling
app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404', {
            title: 'Page Not Found'
        });
    } else if (req.accepts('json')) {
        res.json({ error: "404 Not Found" });
    } else {
        res.type('txt').send("404 Not Found");
    }
});

// Start the server
mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});

mongoose.connection.on('error', (err) => {
    console.error('Error connecting to MongoDB:', err);
});
