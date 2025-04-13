const mongoose = require('mongoose');

const LiveSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Live', LiveSchema);
