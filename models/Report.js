const mongoose = require('mongoose');

// Report Schema
const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['post', 'comment'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type', // Dynamically references 'ForumPost' or 'Comment'
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Assuming you have a User model
  },
  reason: {
    type: String,
    default: 'Inappropriate content',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = { Report };
