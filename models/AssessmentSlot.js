const mongoose = require('mongoose');

const assessmentSlotSchema = new mongoose.Schema({
    adminName: {
        lastName: String,
        firstName: String,
        middleInitial: String,
        suffix: String,
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    // --- NEW: Link to the application that booked this slot ---
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplyStaff', // Use the correct model name 'ApplyStaff'
        default: null // null if not booked
    },
    // --- Optional: Denormalized fields for quick display ---
    applicantName: { type: String, default: null }, // e.g., "Doe, John A."
    applicantSection: { type: String, default: null },
    // --- End NEW ---
}, { timestamps: true });

assessmentSlotSchema.index({ date: 1, time: 1, department: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentSlot', assessmentSlotSchema);