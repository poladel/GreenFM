const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    day: String,
    time: String,
    title: String,
    description: String,
    schoolYear: String,
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
