const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    Monday: { type: String },
    Tuesday: { type: String },
    Wednesday: { type: String },
    Thursday: { type: String },
    Friday: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
