const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumPost',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Comment', commentSchema);