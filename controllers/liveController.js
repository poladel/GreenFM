const Comment = require('../models/Comment');

const getComments = async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: 1 }).lean();
        res.json(comments);
    } catch (err) {
        console.error('Error loading comments:', err.message);
        res.status(500).json({ message: 'Failed to load comments' });
    }
};

module.exports = { getComments };
