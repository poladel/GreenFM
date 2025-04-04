const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const Post = require('../models/Post');

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'uploads',
            format: file.mimetype.split('/')[1], // Dynamically set format
            resource_type: "auto"
        };
    }
});

const upload = multer({ storage });

// Handle post creation
const createPost = async (req, res) => {
    try {
        console.log('🟢 Received POST request:', req.body); 
        console.log('🟢 Uploaded files:', req.files);

        const { title, text } = req.body;
        if (!title || !text) {
            console.error("🔴 Missing title or text:", { title, text });
            return res.status(400).json({ error: "Title and content are required." });
        }

        // Extract multiple images
        const images = req.files['media'] ? req.files['media'].map(file => file.path) : [];

        // Extract video (if available)
        const video = req.files['video'] ? req.files['video'][0].path : null;

        const post = new Post({
            userId: req.user._id,
            title: title.trim(),
            text: text.trim(),
            media: images,  // Store as an array
            video: video
        });

        await post.save();
        console.log("🟢 Post saved successfully:", post);
        res.json({ success: true, post });

    } catch (err) {
        console.error('🔴 Error saving post:', err);
        res.status(500).json({ error: `Failed to create post: ${err.message}` });
    }
};

// Fetch all posts
const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate('userId', 'username').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};

module.exports = {
    upload,
    createPost,
    getAllPosts
};