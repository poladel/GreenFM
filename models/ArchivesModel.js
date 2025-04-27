const mongoose = require('mongoose');

const ArchiveSchema = new mongoose.Schema({
    postId: { type: String, required: true },
    message: { type: String, required: false },
    createdTime: { type: Date, required: true },
    media: { type: String, required: false },  // Store URLs of images, videos, etc.
    type: { type: String, required: false },   // Type of post (video, image, text)
});

module.exports = mongoose.model('Archives', ArchiveSchema);
