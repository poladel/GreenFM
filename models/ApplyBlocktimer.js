const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const nameSchema = new Schema({
    lastName: {
        type: String,
        // Make required only if notApplicable is false or undefined
        required: function() { return !this.notApplicable; }
    },
    firstName: {
        type: String,
        // Make required only if notApplicable is false or undefined
        required: function() { return !this.notApplicable; }
    },
    mi: String,
    suffix: String,
    cys: String, // Course, Year, Section or Department for Faculty
    department: String, // Only for Faculty/Staff
    notApplicable: { type: Boolean, default: false }
}, { _id: false });

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

// Define the preferred schedule structure ONCE
const preferredScheduleSchema = new Schema({
    day: { type: String }, // Optional day
    time: { type: String }  // Optional time
}, { _id: false });


const applyBlocktimerSchema = new Schema({
    organizationType: { type: String, required: true },
    organizationName: { type: String, required: true },
    proponent: { type: nameSchema, required: true },
    coProponent: nameSchema,
    showDetails: { type: showDetailsSchema, required: true },
    executiveProducer: { type: nameSchema, required: true },
    facultyStaff: nameSchema,
    hosts: [{ type: nameSchema, required: true }],
    technicalStaff: [{ type: nameSchema, required: true }],
    creativeStaff: { type: nameSchema, required: true },
    contactInfo: { type: contactInfoSchema, required: true },
    // Use the defined schema here
    preferredSchedule: { type: preferredScheduleSchema },
    agreement: { type: String, enum: ['Agree'], required: true },
    proponentSignature: { type: String, required: true },
    submittedBy: { type: String, required: true },
    submittedOn: { type: Date, default: Date.now },
    schoolYear: { type: String, required: true },
    result: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'pending', 'accepted', 'rejected'],
        default: 'Pending'
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

applyBlocktimerSchema.virtual('schedule', {
    ref: 'Schedule', // The model to use
    localField: '_id', // Find schedules where `submissionId` (foreign field) is equal to `ApplyBlocktimer`'s `_id`
    foreignField: 'submissionId', // is equal to `foreignField`
    justOne: true // We expect to find one schedule per submission
});
// --- END VIRTUAL POPULATE ---


const ApplyBlocktimer = mongoose.model('ApplyBlocktimer', applyBlocktimerSchema);

module.exports = ApplyBlocktimer;
