const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
  folderName: {
    type: String,
    required: true,
  },
  files: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Archive', archiveSchema);