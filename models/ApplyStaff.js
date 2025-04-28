const mongoose = require('mongoose');

const ApplyStaffSchema = new mongoose.Schema({
  // --- ADD userId ---
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference the User model
    required: true,
    index: true // Add index for faster lookups if needed
  },
  // --- END ADD ---
  lastName: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  middleInitial: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  studentNumber: {
    type: String,
    required: true
  },
  dlsudEmail: {
    type: String,
    required: true,
    match: [/^[\w.%+-]+@dlsud.edu.ph$/, 'Please enter a valid DLSU-D email address'],
  },
  college: {
    type: String,
    required: true,
    enum: ['CLAC', 'CBAA', 'CCJE', 'COED', 'CEAT', 'COSC', 'CICS', 'CTHM'],
  },
  program: {
    type: String,
    required: true,
  },
  collegeYear: {
    type: String,
    required: true,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  },
  section: {
    type: String,
    required: true,
  },
  facebookUrl: {
    type: String,
    required: true,
  },
  affiliatedOrgsList: {
    listInput: String,
    notApplicable: { type: Boolean, default: false },
  },
  preferredDepartment: {
    type: String,
    required: true,
    enum: ['News and Public Affairs', 'Music and Entertainment', 'Operations and Logistics', 'Creatives and Promotions'],
  },
  staffApplicationReasons: {
    type: String,
    required: true,
  },
  departmentApplicationReasons: {
    type: String,
    required: true,
  },
  greenFmContribution: {
    type: String,
    required: true,
  },
  preferredSchedule: {
    date: { type: String, required: true },
    time: { type: String, required: true },
  },
  schoolYear: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'], // Keep consistent casing
    default: 'Pending'
  },
}, { timestamps: true });

// Compile the schema into a model and export
const ApplyStaff = mongoose.model('ApplyStaff', ApplyStaffSchema);
module.exports = ApplyStaff;
