const SchoolYear = require("../models/SchoolYear");

const getCurrentSchoolYear = (startMonth, startYear, endMonth, endYear) => {
    return `${startMonth}/${startYear} - ${endMonth}/${endYear}`;
};

module.exports.getSchoolYear = async (req, res) => {
    try {
        const config = await SchoolYear.findOne();
        if (!config) {
            return res.status(404).json({ error: "School year configuration not found" });
        }

        const currentSchoolYear = getCurrentSchoolYear(
            config.startMonth,
            config.startYear,
            config.endMonth,
            config.endYear
        );
        res.json({ schoolYear: currentSchoolYear });
    } catch (error) {
        console.error("Error fetching school year:", error);
        res.status(500).json({ error: "Failed to fetch school year" });
    }
};

module.exports.updateSchoolYearConfig = async (req, res) => {
    try {
        const { startMonth, startYear, endMonth, endYear } = req.body;

        console.log("Received data:", { startMonth, startYear, endMonth, endYear });

        // Check if a school year configuration with the same startYear and endYear already exists
        const existingConfig = await SchoolYear.findOne({ startYear, endYear });
        if (existingConfig) {
            return res.status(400).json({ error: "School year configuration already exists" });
        }

        // Create a new school year configuration
        const newConfig = new SchoolYear({
            startMonth,
            startYear,
            endMonth,
            endYear,
        });

        // Save the new configuration to the database
        await newConfig.save();

        res.json({ message: "New school year configuration saved successfully" });
    } catch (error) {
        console.error("Error saving new school year configuration:", error);
        res.status(500).json({ error: "Failed to save new school year configuration" });
    }
};

module.exports.getAllSchoolYears = async (req, res) => {
    try {
        const schoolYears = await SchoolYear.find().sort({ startYear: 1 }); // Sort by startYear
        res.json(schoolYears);
    } catch (error) {
        console.error("Error fetching school years:", error);
        res.status(500).json({ error: "Failed to fetch school years" });
    }
};