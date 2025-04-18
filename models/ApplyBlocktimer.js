const mongoose = require('mongoose');

const ApplyBlocktimerSchema = new mongoose.Schema({
  organizationType: {
    type: String,
    enum: [
      "Administration",
      "Student Government",
      "Department",
      "Program Council",
      "Faculty",
      "Interest Organization"
    ],
    required: true,
  },
  organizationName: {
    type: String,
    required: true,
  },
  proponent: {
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    suffix: String,
    cys: String,
  },
  coProponent: {
    lastName: String,
    firstName: String,
    mi: String,
    suffix: String,
    cys: String,
    notApplicable: { type: Boolean, default: false },
  },
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
  facultyStaff: {
    lastName: String,
    firstName: String,
    mi: String,
    suffix: String,
    department: String,
    notApplicable: { type: Boolean, default: false },
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
  agreement: {
    type: String,
    enum: ["Agree"],
    required: true,
  },
  contactInfo: {
    dlsudEmail: { type: String, required: true, match: /@dlsud.edu.ph$/ },
    contactEmail: { type: String, required: true },
    contactFbLink: { type: String, required: true },
    crossposting: {
      type: String,
      enum: ["Yes", "No"],
      required: true,
    },
    fbLink: String,
  },
  proponentSignature: {
    type: String, // URL or path to the signature file
    required: true,
  },
  submittedBy: {
    type: String, // User's email
    required: true,
  },
  submittedOn: {
    type: Date, // Date and time of submission
    default: Date.now, // Automatically set to the current date/time
  },
  preferredSchedule: {
    day: { type: String, required: true },
    time: { type: [String], required: true },
  },
  schoolYear: {
    type: String,
    required: true
  },
  result: {
    type: String,
    required: false,
    default: "Pending",
  },
}, {
  timestamps: true,
});

// Compile the schema into a model and export
const ApplyBlocktimer = mongoose.model('ApplyBlocktimer', ApplyBlocktimerSchema);
module.exports = ApplyBlocktimer;
