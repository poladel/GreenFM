const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AssessmentPeriodSchema = new Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    year: { type: Number, required: true, unique: true } // Make year unique
}, { timestamps: true });

// Remove specific index definition if it only involved 'key'
// AssessmentPeriodSchema.index({ key: 1, year: 1 }, { unique: true }); // REMOVED or ensure it's just { year: 1 } if needed

module.exports = mongoose.model('AssessmentPeriod', AssessmentPeriodSchema);