const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false } // ✅ Supports soft-delete
});

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, required: true }
}, { _id: false });

const forumPostSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: [mediaSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ForumPost', forumPostSchema, 'ForumPosts');
