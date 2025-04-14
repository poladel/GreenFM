const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    start: String,
    end: String,
    title: String
}, { _id: false }); // Disable _id on subdocs to keep it clean

const scheduleSchema = new mongoose.Schema({
    Monday: [slotSchema],
    Tuesday: [slotSchema],
    Wednesday: [slotSchema],
    Thursday: [slotSchema],
    Friday: [slotSchema]
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
