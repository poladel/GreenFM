const mongoose = require('mongoose');

const ScheduleOverrideSchema = new mongoose.Schema({
  // Link to the admin user if needed (optional, but good practice)
  // adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastName: { // Store admin details for easier display/querying if not linking
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
  cys: { // Course, Year, Section for the override
    type: String,
    required: true,
  },
  department: { // Department the override applies to
    type: String,
    required: true,
  },
  date: { // The specific date of the override (YYYY-MM-DD)
    type: String, // Store as String for easier matching with frontend values
    required: true,
    index: true, // Index for faster querying
  },
  time: { // The specific time slot (e.g., "7:00-8:00")
    type: String,
    required: true,
  },
  subject: { // Subject for the override
    type: String,
    required: true,
  },
  roomNum: { // Room number for the override
    type: String,
    required: true,
  },
  year: { // Year the override falls into (useful for querying)
    type: String, // Store as String to match AdminSchedule
    required: true,
    index: true,
  },
  status: { // Indicates the effect of the override
    type: String,
    enum: ['unavailable', 'available'], // 'unavailable' blocks the slot, 'available' might override a recurring block
    default: 'unavailable', // Default to making the slot unavailable
    required: true,
  },
}, { timestamps: true });

// Compound index for efficient upsert/lookup
ScheduleOverrideSchema.index({ date: 1, time: 1, department: 1, year: 1 }, { unique: true });

const ScheduleOverride = mongoose.model('ScheduleOverride', ScheduleOverrideSchema);
module.exports = ScheduleOverride;