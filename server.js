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
const nodemailer = require('nodemailer'); // Add Nodemailer


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
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
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const contactRoutes = require('./routes/contactRoutes');
const postRoutes = require('./routes/postRoutes');

app.get('*', checkUser);
app.use(root);
app.use(userRoutes);
app.use(authRoutes);
app.use(joinGFMRoutes);
app.use(joinBlocktimerRoutes);
app.use(uploadRoutes);
app.use('/playlist', playlistRoutes);
app.use(contactRoutes);
app.use(postRoutes);

// Handle feedback form submission
app.post('/send', async (req, res) => {
  const { name, email, message } = req.body;

  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Use environment variable for Gmail
      pass: process.env.GMAIL_PASS, // Use environment variable for Gmail password
    },
  });

  // Email options
  const mailOptions = {
    from: process.env.GMAIL_USER, // Your Gmail address
    to: `${process.env.ADMIN_EMAIL}, ${process.env.DLSUD_EMAIL}`, // Send to both Gmail and DLSUD email
    replyTo: email, // The user's email address (for replies)
    subject: `New Message from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #0b730d;">New Message from ${name}</h2>
        <p>You have received a new message from a user. Here are the details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Message</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${message}</td>
          </tr>
        </table>
  
        <p style="margin-top: 20px;">Please respond to this message at your earliest convenience.</p>
        <p>Best regards,<br>Your Application Team</p>
      </div>
    `,
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response); // Log success
    res.send('Feedback sent successfully!'); // Plain text response
  } catch (error) {
    console.error('Error sending email:', error); // Log full error
    res.status(500).send(`Error sending feedback: ${error.message}`); // Plain text response
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

// Start the server
mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});