const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    Monday: [{ time: String, title: String }],
    Tuesday: [{ time: String, title: String }],
    Wednesday: [{ time: String, title: String }],
    Thursday: [{ time: String, title: String }],
    Friday: [{ time: String, title: String }]
}, { timestamps: true });


module.exports = mongoose.model('Schedule', scheduleSchema);
