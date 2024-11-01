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
const PORT = process.env.PORT || 3000;

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
const userRoutes = require('./routes/user-routes');
const authRoutes = require('./routes/authRoutes');
const { checkUser } = require('./middleware/authMiddleware');
const joinGFMRoutes = require('./routes/joinGFMRoutes');
<<<<<<< HEAD
=======
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
>>>>>>> 80eba51d7ac3ee255d8536f92a19d99e89c0bb79

app.get('*', checkUser);
app.use(root);
app.use(userRoutes);
app.use(authRoutes);
app.use(joinGFMRoutes);
<<<<<<< HEAD
=======
app.use(joinBlocktimerRoutes);
app.use(uploadRoutes);
>>>>>>> 80eba51d7ac3ee255d8536f92a19d99e89c0bb79

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
