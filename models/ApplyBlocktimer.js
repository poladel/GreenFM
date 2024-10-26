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
  officeOrganizationName: {
    type: String,
    required: true,
  },
  proponent: {
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    cys: { type: String, required: true },
  },
  coProponent: {
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    cys: { type: String, required: true },
    notApplicable: { type: Boolean, default: false },
  },
  showDetails: {
    title: String,
    type: [String],
    description: { type: String, required: true },
    objectives: { type: String, required: true },
  },
  executiveProducer: {
    lastName: String,
    firstName: String,
    mi: String,
    cys: { type: String, required: true },
  },
  facultyStaff: {
    lastName: String,
    firstName: String,
    mi: String,
    department: String,
    notApplicable: { type: Boolean, default: false },
  },
  hosts: [{
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    cys: { type: String, required: true },
  }],
  technicalStaff: [{
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: String,
    cys: { type: String, required: true },
  }],
  creativeStaff: {
    lastName: String,
    firstName: String,
    mi: String,
    cys: { type: String, required: true },
  },
  agreement: {
    type: String,
    enum: ["Agree"],
    required: true,
  },
  contactInfo: {
    dlsudEmail: { type: String, required: true, match: /@dlsud.edu.ph$/ },
    contactPerson: { type: String, required: true },
    crossposting: {
      type: String,
      enum: ["Yes", "No"],
      required: true,
    },
    fbLink: String,
    contactEmail: { type: String, required: true, match: /@dlsud.edu.ph$/ },
    contactFbLink: { type: String, required: true },
  },
  proponentSignature: {
    type: String, // URL or path to the signature file
    required: true,
  },
}, {
  timestamps: true,
});

// Compile the schema into a model and export
const ApplyBlocktimer = mongoose.model('ApplyBlocktimer', ApplyBlocktimerSchema);
module.exports = ApplyBlocktimer;
