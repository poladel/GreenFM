const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicationPeriodSchema = new Schema({
    key: { type: String, required: true, index: true }, // Key remains indexed
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    year: { type: Number, required: true, index: true } // Add indexed year field
}, { timestamps: true });

// Optional: Compound index to ensure only one document per key+year combination
// ApplicationPeriodSchema.index({ key: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ApplicationPeriod', ApplicationPeriodSchema);