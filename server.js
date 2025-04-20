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
const nodemailer = require('nodemailer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const forumRoutes = require('./routes/ForumRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionMiddleware);
app.use('/', forumRoutes); 
app.use('/', require('./routes/ForumRoutes'));


// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'forum_media',
        resource_type: 'auto'
    }
});

// Connecting to MongoDB Atlas
mongoose.set('strictQuery', false);
connectDB();



// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '/public')));

// Register view engine
app.set('view engine', 'ejs');

// Define your routes
const root = require('./routes/root');
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
const schedRoutes = require('./routes/scheduleRoutes');
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');

const ForumPost = require('./models/ForumPost');

// Start server with enhanced logging

// Existing routes
app.get('*', checkUser);
app.use(root);
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
app.use(contactRoutes);
app.use(manageRoutes);
app.use('/live', liveRoutes);
app.use(schedRoutes);
app.use(express.static('public'));

// Handle feedback form submission
app.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    // Email options
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: `${process.env.ADMIN_EMAIL}, ${process.env.DLSUD_EMAIL}`,
        replyTo: email,
        subject: `New Message from ${name}`,
        html: mailHtml,
      };
      

    // Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        res.send('Feedback sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send(`Error sending feedback: ${error.message}`);
    }
});

// 404 Handling
app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404', {
            title: 'Page Not Found',
        });
    } else if (req.accepts('json')) {
        res.json({ error: '404 Not Found' });
    } else {
        res.type('txt').send('404 Not Found');
    }
});


mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Database: ${mongoose.connection.db.databaseName}`);
    });
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));  
