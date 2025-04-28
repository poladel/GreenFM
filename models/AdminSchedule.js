const mongoose = require('mongoose');

const AdminScheduleSchema = new mongoose.Schema({
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
  cys: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  roomNum: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Compile the schema into a model and export
const AdminSchedule = mongoose.model('AdminSchedule', AdminScheduleSchema);
module.exports = AdminSchedule;
