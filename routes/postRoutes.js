const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer storage for images, videos, and documents
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Cloudinary folder where files will be stored
        allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'pdf', 'doc', 'docx'],
        resource_type: 'auto' // Automatically detect the file type (image, video, etc.)
    }
});

const upload = multer({ storage });

// File filter to allow only images, videos, and documents
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('application/')
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only images, videos, and documents are allowed!'), false);
    }
};

// API to handle posts with images/videos/documents
router.post('/post', requireAuth, upload.fields([{ name: 'media' }, { name: 'document' }]), async (req, res) => {
    try {
        const { text } = req.body;
        const media = req.files['media'] ? req.files['media'][0].path : null; // Cloudinary URL
        const document = req.files['document'] ? req.files['document'][0].path : null; // Cloudinary URL

        const post = new Post({ userId: req.user._id, text, media, document });

        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('Error saving post:', err);
        res.status(500).json({ error: `Failed to create post: ${err.message}` });
    }
});

module.exports = router;

// Create a post
router.post('/post', requireAuth, upload.fields([{ name: 'media' }, { name: 'document' }]), async (req, res) => {
    try {
        const { text } = req.body;
        const media = req.files['media'] ? `/uploads/media/${req.files['media'][0].filename}` : null;
        const document = req.files['document'] ? `/uploads/docs/${req.files['document'][0].filename}` : null;

        const post = new Post({ userId: req.user._id, text, media, document });
        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Fetch all posts
router.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().populate('userId', 'username').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

module.exports = router;
