const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    day: String,
    time: String,
    schoolYear: String,
    showDetails: {
        title: { type: String, required: true },
        type: { type: [String], required: true },
        description: { type: String, required: true },
        objectives: { type: String, required: true },
    },
    executiveProducer: {
        lastName: { type: String, required: true },
        firstName: { type: String, required: true },
        mi: String,
        suffix: String,
        cys: String,
    },
    hosts: [{
        lastName: { type: String, required: true },
        firstName: { type: String, required: true },
        mi: String,
        suffix: String,
        cys: String,
    }],
    technicalStaff: [{
        lastName: { type: String, required: true },
        firstName: { type: String, required: true },
        mi: String,
        suffix: String,
        cys: String,
    }],
    creativeStaff: {
        lastName: { type: String, required: true },
        firstName: { type: String, required: true },
        mi: String,
        suffix: String,
        cys: String,
    },
    submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplyBlocktimer', // Link to the submission
        required: true,
        index: true // Good for lookups
    },
    confirmationStatus: { // NEW FIELD
        type: String,
        enum: ['Accepted', 'Pending Confirmation'],
        default: 'Accepted',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
