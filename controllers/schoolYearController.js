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
        const newStartMonth = parseInt(startMonth, 10);
        const newStartYear = parseInt(startYear, 10);
        const newEndMonth = parseInt(endMonth, 10);
        const newEndYear = parseInt(endYear, 10);

        console.log("Received data for config update/create:", { newStartMonth, newStartYear, newEndMonth, newEndYear });

        // --- ADDED VALIDATION: End year must be exactly start year + 1 ---
        if (newEndYear !== newStartYear + 1) {
            return res.status(400).json({ error: `End year (${newEndYear}) must be ONE year after the start year (${newStartYear}).` });
        }
        // --- END ADDED VALIDATION ---

        // Basic validation (e.g., end date must be after start date - this is now implicitly covered by the above check if months are valid, but kept for clarity)
        // Note: With the new rule, this check is only relevant if startMonth could be >= endMonth within the allowed year span.
        // Example: 12/2024 - 1/2025 is valid, but 1/2024 - 1/2025 might not be intended depending on exact rules.
        // The original check is fine as a basic sanity check.
        if (newStartYear > newEndYear || (newStartYear === newEndYear && newStartMonth >= newEndMonth)) {
             return res.status(400).json({ error: "End date must be chronologically after the start date." });
        }


        // Check if a configuration with the same startYear and endYear already exists
        const existingConfig = await SchoolYear.findOne({ startYear: newStartYear, endYear: newEndYear });

        let savedConfig;
        let statusCode = 201; // Default to 201 Created

        if (existingConfig) {
            console.log("Found existing config:", existingConfig);
            // --- Configuration with these years exists, check if it can be updated ---
            const now = new Date();
            // Set hours, minutes, seconds, ms to 0 for day-level comparison
            now.setHours(0, 0, 0, 0);

            // Construct start date of the existing config (Month is 0-indexed)
            const existingStartDate = new Date(existingConfig.startYear, existingConfig.startMonth - 1, 1);
            existingStartDate.setHours(0, 0, 0, 0);

            // Construct end date of the existing config (End of the last day of the month)
            // Go to the first day of the *next* month, then subtract one day
            const existingEndDate = new Date(existingConfig.endYear, existingConfig.endMonth, 1); // Next month's first day
            existingEndDate.setDate(existingEndDate.getDate() - 1); // Go back one day to get last day of endMonth
            existingEndDate.setHours(0, 0, 0, 0);

            console.log("Current Date:", now.toISOString());
            console.log("Existing Start Date:", existingStartDate.toISOString());
            console.log("Existing End Date:", existingEndDate.toISOString());


            // Check if the current date is outside the existing config's active period
            if (now < existingStartDate || now > existingEndDate) {
                console.log("Existing config is not currently active. Proceeding with update.");
                // Safe to update: Update the existing document
                existingConfig.startMonth = newStartMonth;
                // existingConfig.startYear = newStartYear; // Year is the same by definition here
                existingConfig.endMonth = newEndMonth;
                // existingConfig.endYear = newEndYear; // Year is the same by definition here

                savedConfig = await existingConfig.save();
                statusCode = 200; // Use 200 OK for update
                console.log("Existing config updated successfully.");

            } else {
                // Cannot update: The existing configuration is currently active
                console.log("Update rejected: Existing config is currently active.");
                return res.status(409).json({ // 409 Conflict is suitable here
                    error: `Cannot modify the configuration for ${existingConfig.startYear}-${existingConfig.endYear} because it is currently active (${existingConfig.startMonth}/${existingConfig.startYear} - ${existingConfig.endMonth}/${existingConfig.endYear}).`
                });
            }

        } else {
            // --- No configuration with these years exists, create a new one ---
            console.log("No existing config found for these years. Creating new one.");
            const newConfig = new SchoolYear({
                startMonth: newStartMonth,
                startYear: newStartYear,
                endMonth: newEndMonth,
                endYear: newEndYear,
            });
            savedConfig = await newConfig.save();
            statusCode = 201; // Use 201 Created
            console.log("New config created successfully.");
        }

        // --- Emit Socket.IO event ---
        const allConfigs = await SchoolYear.find().sort({ startYear: 1, startMonth: 1 });

        // Get io instance from the app instance (assuming set in server.js)
        const io = req.app.get('socketio');

        if (io) {
            io.emit('schoolYearUpdate', allConfigs);
            console.log('Emitted schoolYearUpdate event with updated config list.');
        } else {
            console.warn('Socket.IO instance (io) not found on req.app. Cannot emit update.');
            // Consider if emission failure should be an error or just a warning
        }

        // Respond with success
        const message = statusCode === 201 ? "New school year configuration saved successfully" : "School year configuration updated successfully";
        res.status(statusCode).json({ message, config: savedConfig });

    } catch (error) {
        console.error("Error saving/updating school year configuration:", error); // <<< CHECK THIS LOG ON YOUR SERVER
        // Handle potential validation errors from Mongoose save()
        if (error.name === 'ValidationError') {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to save or update school year configuration" });
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