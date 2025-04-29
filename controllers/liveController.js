const Comment = require('../models/Comment');

// Get live comments
const getComments = async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: 1 }).lean();
        res.json(comments);
    } catch (err) {
        console.error('Error loading comments:', err.message);
        res.status(500).json({ message: 'Failed to load comments' });
    }
};

// Get current user's username
const getUsername = (req, res) => {
    if (req.user) {
        res.json({ username: req.user.username });
    } else {
        res.json({ username: 'Anonymous' });
    }
};

module.exports = { getComments, getUsername };
