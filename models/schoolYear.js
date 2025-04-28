const mongoose = require("mongoose");

const SchoolYearSchema = new mongoose.Schema({
    startMonth: { type: Number, required: true }, // e.g., 8 for August
    startYear: { type: Number, required: true },  // e.g., 2024
    endMonth: { type: Number, required: true },   // e.g., 5 for May
    endYear: { type: Number, required: true },    // e.g., 2025
});

// Compile the schema into a model and export
const SchoolYear = mongoose.model("SchoolYear", SchoolYearSchema); 
module.exports = SchoolYear;