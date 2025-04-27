const mongoose = require('mongoose');

// Define the schema for the post
const AdminArchivesSchema = new mongoose.Schema({
    videoUrl: { type: String, required: false },
    imageUrl: { type: String, required: false },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Create and export the model
module.exports = mongoose.model('AdminArchives', AdminArchivesSchema);
