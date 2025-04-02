const express = require('express');
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer storage for images, videos, and documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, 'public/uploads/images/');
        } else if (file.mimetype.startsWith('video/')) {
            cb(null, 'public/uploads/videos/');
        } else if (file.mimetype.startsWith('application/') || file.mimetype === 'application/pdf') {
            cb(null, 'public/uploads/docs/');
        } else {
            cb(new Error('Invalid file type'), false);
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

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

const upload = multer({ storage, fileFilter });

// API to handle posts with images/videos/documents
router.post('/post', requireAuth, upload.fields([{ name: 'media' }, { name: 'document' }]), async (req, res) => {
    try {
        const { text } = req.body;
        const mediaFile = req.files['media'] ? req.files['media'][0] : null;
        const docFile = req.files['document'] ? req.files['document'][0] : null;

        const media = mediaFile ? 
            (mediaFile.mimetype.startsWith('video/') ? `/uploads/videos/${mediaFile.filename}` : `/uploads/images/${mediaFile.filename}`) 
            : null;
        const document = docFile ? `/uploads/docs/${docFile.filename}` : null;

        console.log("Uploaded Media:", media);  // Debug log
        console.log("Uploaded Document:", document);  // Debug log

        const post = new Post({ 
            userId: req.user._id, 
            text, 
            media, 
            document 
        });

        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('Error saving post:', err); // More detailed error log
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
