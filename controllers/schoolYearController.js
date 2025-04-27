const SchoolYear = require("../models/schoolYear"); // Use your existing model name

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

        // --- Your existing validation ---
        // Check if a school year configuration with the same startYear and endYear already exists
        const existingConfig = await SchoolYear.findOne({ startYear, endYear });
        if (existingConfig) {
            return res.status(400).json({ error: "School year configuration already exists" });
        }
        // Add other validation if needed (e.g., endYear < startYear)
        // --- End Validation ---

        // Create a new school year configuration
        const newConfig = new SchoolYear({
            startMonth,
            startYear,
            endMonth,
            endYear,
        });

        // Save the new configuration to the database
        await newConfig.save();

        // --- ADD SOCKET.IO EMIT LOGIC ---
        // Fetch the updated list of all school years after saving
        // Sort by startYear, then startMonth for consistent ordering
        const allConfigs = await SchoolYear.find().sort({ startYear: 1, startMonth: 1 });

        // Emit an event to all connected clients with the updated list
        if (req.io) { // Check if the io instance is attached to the request
            req.io.emit('schoolYearUpdate', allConfigs);
            console.log('Emitted schoolYearUpdate event with new config list.');
        } else {
            console.warn("Socket.io instance (req.io) not found in schoolYearController.updateSchoolYearConfig. Cannot emit event.");
        }
        // --- END SOCKET.IO EMIT LOGIC ---

        // Respond with success (use 201 Created status)
        res.status(201).json({ message: "New school year configuration saved successfully", config: newConfig });

    } catch (error) {
        console.error("Error saving new school year configuration:", error);
        res.status(500).json({ error: "Failed to save new school year configuration" });
    }
};

module.exports.getAllSchoolYears = async (req, res) => {
    try {
        // Sort by startYear, then startMonth for consistent ordering
        const schoolYears = await SchoolYear.find().sort({ startYear: 1, startMonth: 1 });
        res.json(schoolYears);
    } catch (error) {
        console.error("Error fetching school years:", error);
        res.status(500).json({ error: "Failed to fetch school years" });
    }
};

// Remember to add similar emit logic if you have functions to *update* or *delete* school year configurations.