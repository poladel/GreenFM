const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const nameSchema = new Schema({
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    suffix: String,
    cys: String, // Course, Year, Section or Department for Faculty
    department: String, // Only for Faculty/Staff
    notApplicable: { type: Boolean, default: false }
}, { _id: false }); // No separate _id for subdocuments unless needed

const showDetailsSchema = new Schema({
    title: { type: String, required: true },
    type: [{ type: String }], // Array of strings for multiple types
    description: { type: String, required: true },
    objectives: { type: String, required: true }
}, { _id: false });

const contactInfoSchema = new Schema({
    dlsudEmail: { type: String, required: true, lowercase: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactFbLink: { type: String, required: true },
    crossposting: { type: String, enum: ['Yes', 'No'], required: true },
    fbLink: String // Optional FB link if crossposting is Yes
}, { _id: false });

const preferredScheduleSchema = new Schema({
    day: { type: String }, // Removed required: true temporarily if needed
    time: { type: String }  // Removed required: true temporarily if needed
}, { _id: false });


const applyBlocktimerSchema = new Schema({
    organizationType: { type: String, required: true },
    organizationName: { type: String, required: true },
    proponent: { type: nameSchema, required: true },
    coProponent: nameSchema, // Not strictly required
    showDetails: { type: showDetailsSchema, required: true },
    executiveProducer: { type: nameSchema, required: true },
    facultyStaff: nameSchema, // Not strictly required
    hosts: [{ type: nameSchema, required: true }], // Array of hosts
    technicalStaff: [{ type: nameSchema, required: true }], // Array of technical staff
    creativeStaff: { type: nameSchema, required: true },
    contactInfo: { type: contactInfoSchema, required: true },
    preferredSchedule: { type: preferredScheduleSchema }, // Optional initially
    agreement: { type: String, enum: ['Agree'], required: true },
    proponentSignature: { type: String, required: true }, // URL from Cloudinary
    submittedBy: { type: String, required: true }, // User's email
    submittedOn: { type: Date, default: Date.now },
    schoolYear: { type: String, required: true }, // e.g., "2024-2025"
    result: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'pending', 'accepted', 'rejected'], // Allow both cases initially, normalize later if needed
        default: 'Pending'
    },
    // Add requiresAcknowledgement if needed for user flow
    // requiresAcknowledgement: { type: Boolean, default: false }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    // --- ADD THESE OPTIONS FOR VIRTUALS ---
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    // --- END ADD ---
});

// --- ADD VIRTUAL POPULATE ---
applyBlocktimerSchema.virtual('schedule', {
    ref: 'Schedule', // The model to use
    localField: '_id', // Find Schedule where `localField`
    foreignField: 'submissionId', // is equal to `foreignField`
    justOne: true // We expect to find one schedule per submission
});
// --- END VIRTUAL POPULATE ---


const ApplyBlocktimer = mongoose.model('ApplyBlocktimer', applyBlocktimerSchema);

module.exports = ApplyBlocktimer;
