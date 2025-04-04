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

// Update a post
const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, text } = req.body;

        console.log('Received data in backend:');
        console.log('Title:', title);  // Log title
        console.log('Text:', text);    // Log text

        if (!title || !text) {
            return res.status(400).json({ error: 'Title and text are required to update a post.' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.title = title.trim();
        post.text = text.trim();

        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        console.error('🔴 Error updating post:', err);
        res.status(500).json({ error: `Failed to update post: ${err.message}` });
    }
};

// Utility function to extract public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
    const segments = url.split('/');
    const fileName = segments[segments.length - 1];
    const publicId = fileName.split('.')[0];  // Extract ID
    return publicId;
}

// Delete a post
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Delete associated media from Cloudinary
        for (let mediaUrl of post.media) {
            const publicId = getPublicIdFromUrl(mediaUrl);
            const result = await cloudinary.uploader.destroy(publicId);
            console.log('Cloudinary delete result:', result);  // Log result for debugging
        }

        // Delete video from Cloudinary if it exists
        if (post.video) {
            const publicId = getPublicIdFromUrl(post.video);
            const result = await cloudinary.uploader.destroy(publicId);
            console.log('Cloudinary delete result for video:', result);  // Log result for debugging
        }

        // Now, delete the post from the database
        await Post.deleteOne({ _id: postId });

        res.json({ success: true, message: 'Post and associated media deleted successfully' });
    } catch (err) {
        console.error('🔴 Error deleting post:', err);
        res.status(500).json({ error: `Failed to delete post: ${err.message}` });
    }
};

module.exports = {
    upload,
    createPost,
    getAllPosts,
    updatePost,
    deletePost,
    getPublicIdFromUrl
};