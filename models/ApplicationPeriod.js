const mongoose = require('mongoose');

const ApplicationPeriodSchema = new mongoose.Schema({
    key: { type: String, required: true }, // Unique identifier for the route group
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
});

module.exports = mongoose.model('ApplicationPeriod', ApplicationPeriodSchema);