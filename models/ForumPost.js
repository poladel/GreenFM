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
  type: { type: String, required: true }
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
  media: [mediaSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  poll: {
    question: String,
    options: [pollOptionSchema]
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ Report Schema
const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: 'Inappropriate content' },
  createdAt: { type: Date, default: Date.now }
});

// Export models
const ForumPost = mongoose.model('ForumPost', forumPostSchema, 'ForumPosts');
const Report = mongoose.model('Report', reportSchema, 'ForumReports');

// Exporting both models and schema if needed elsewhere
module.exports = { ForumPost, Report, forumPostSchema };
module.exports = mongoose.model('ForumPost', forumPostSchema, 'ForumPosts');