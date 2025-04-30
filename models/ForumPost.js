//ForumPost
const mongoose = require('mongoose');

// Comment Schema
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

// Media Schema
const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, required: true }  // Ensure the type is stored (image or video)
}, { _id: false });

// Poll Option Schema
const pollOptionSchema = new mongoose.Schema({
  text: String,
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
});

// Forum Post Schema
const forumPostSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: [mediaSchema],  // Media can be both images and videos
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  poll: {
    question: String,
    options: [pollOptionSchema]
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ForumPost', forumPostSchema, 'ForumPosts');