const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    monday: { type: String, required: true },
    tuesday: { type: String, required: true },
    wednesday: { type: String, required: true },
    thursday: { type: String, required: true },
    friday: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
