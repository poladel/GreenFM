const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Use Schema alias for consistency

// Define a reusable name schema for Schedule, similar to ApplyBlocktimer
// This helps keep structure consistent and allows for conditional requirements
const nameSchemaForSchedule = new Schema({
    lastName: {
        type: String,
        // Required only if notApplicable is false or undefined
        required: function() { return !this.notApplicable; }
    },
    firstName: {
        type: String,
        // Required only if notApplicable is false or undefined
        required: function() { return !this.notApplicable; }
    },
    mi: String,
    suffix: String,
    cys: String, // Keep CYS for consistency, even if not always used here
    department: String, // Add department if applicable for faculty/staff in Schedule
    notApplicable: { type: Boolean, default: false } // To handle cases like 'N/A' faculty
}, { _id: false }); // Prevent creation of subdocument IDs

const scheduleSchema = new Schema({
    day: { type: String, required: true }, // Make day/time/year required for a schedule entry
    time: { type: String, required: true },
    schoolYear: { type: String, required: true },
    showDetails: {
        title: { type: String, required: true },
        type: { type: [String], required: true }, // Array of strings for show type
        description: { type: String, required: true },
        objectives: { type: String, required: true },
    },
    // Use the reusable name schema
    executiveProducer: { type: nameSchemaForSchedule, required: true },
    hosts: [{
        type: nameSchemaForSchedule,
        // The array itself is required, meaning it must exist.
        // The elements inside are validated by nameSchemaForSchedule.
        // Mongoose validation might require the array to have at least one element if 'required' is true.
        // If an empty array is acceptable, consider removing 'required: true' here
        // or adding a custom validator. For now, assume at least one host is needed.
        required: true
    }],
    technicalStaff: [{
        type: nameSchemaForSchedule,
        // Same requirement logic as hosts
        required: true
    }],
    creativeStaff: { type: nameSchemaForSchedule, required: true },
    // Keep facultyStaff if it's relevant directly to the schedule, otherwise remove
    // facultyStaff: { type: nameSchemaForSchedule }, // Example if needed

    submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplyBlocktimer', // Link to the submission that generated this schedule
        // Submission ID might NOT be required if a schedule can be created manually by an admin
        // required: true, // Consider if this is always true
        index: true // Good for lookups if you query by submissionId
    },
    confirmationStatus: {
        type: String,
        enum: ['Accepted', 'Pending Confirmation'], // Status relevant to the schedule slot itself
        default: 'Accepted', // Default when a schedule is created
        required: true
    }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('Schedule', scheduleSchema);
