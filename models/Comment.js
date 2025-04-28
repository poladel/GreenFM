const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        default: 'Anonymous'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto-delete after 1 hour
    }
});

module.exports = mongoose.model('Comment', CommentSchema);
