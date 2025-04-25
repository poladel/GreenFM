const mongoose = require('mongoose');

const assessmentPeriodSchema = new mongoose.Schema({
    // Using a key allows fetching settings without knowing the ID, useful if only one setting exists
    key: {
        type: String,
        required: true,
        unique: true, // Ensure only one assessment period setting exists per key
        default: 'GFMAssessment' // Default key for the main assessment period
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
}, { timestamps: true }); // Add timestamps (createdAt, updatedAt)

module.exports = mongoose.model('AssessmentPeriod', assessmentPeriodSchema);