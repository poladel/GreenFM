require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connecting to MongoDB Atlas
mongoose.set('strictQuery', false);
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); // Exit process with failure
    }
};

// Call the function to connect to MongoDB
connectDB();

// Middleware to parse JSON
app.use(express.json());

// Enable CORS
app.use(cors());

// Serve static files from 'user' and 'admin' directories
app.use('/user', express.static(path.join(__dirname, 'user')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/img', express.static(path.join(__dirname, 'img'))); // Serve images

// Set the 'user/1-home.html' as the startup file for the root URL
app.get('/', (req, res) => {
    const userFilePath = path.join(__dirname, 'user', '1-home.html');
    res.sendFile(userFilePath);
});

// Route for the 'user' sections
app.get('/User-Home', (req, res) => {
    const userFilePath = path.join(__dirname, 'user', '1-home.html');
    res.sendFile(userFilePath);
});

app.get('/User-Live', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '2-live.html');
    res.sendFile(liveFilePath);
});

app.get('/User-Forum', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '3-forum.html');
    res.sendFile(liveFilePath);
});

app.get('/User-Archives', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '4-archives.html');
    res.sendFile(liveFilePath);
});

app.get('/User-Playlist', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '5-playlist.html');
    res.sendFile(liveFilePath);
});

app.get('/User-JoinBlocktimer', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '6-blocktimer.html');
    res.sendFile(liveFilePath);
});

app.get('/User-JoinGFM', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '7-joingreenfm.html');
    res.sendFile(liveFilePath);
});

app.get('/User-About', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '8-about.html');
    res.sendFile(liveFilePath);
});

app.get('/User-Contact', (req, res) => {
    const liveFilePath = path.join(__dirname, 'user', '9-contact.html');
    res.sendFile(liveFilePath);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
