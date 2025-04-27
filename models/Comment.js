const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Automatically delete after 1 hour (3600 seconds)
    }
});

module.exports = mongoose.model('Comment', CommentSchema);
