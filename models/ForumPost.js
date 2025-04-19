const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  media: [{ type: String }],  // Array of strings for multiple media files
  video: { type: String },    // Single video URL
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // Array of user references
  comments: [commentSchema]   // Array of embedded comment documents
}, { 
  timestamps: true  // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('ForumPost', postSchema, 'ForumPosts');