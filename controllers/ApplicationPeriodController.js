const ApplicationPeriod = require('../models/ApplicationPeriod');

module.exports.saveApplicationPeriod = async (req, res) => {
    try {
        // Check if the user is an admin
        if (!req.user || req.user.roles !== 'Admin') {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }

        // Get data and force flag from body
        const { key, startDate: newStartDateStr, endDate: newEndDateStr, force } = req.body;

        // Validate the input
        if (!key || !newStartDateStr || !newEndDateStr) {
            return res.status(400).json({ error: 'Key, start date, and end date are required.' });
        }

        // Parse dates
        const newStartDate = new Date(newStartDateStr);
        const newEndDate = new Date(newEndDateStr);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Normalize current date for comparison

        // Basic date validation
        if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
             return res.status(400).json({ error: 'Invalid date format provided.' });
        }
        if (newEndDate < newStartDate) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }

        const targetYear = newStartDate.getFullYear();

        // Find existing settings for the specific key (used for active check and potential update)
        let existingSettings = await ApplicationPeriod.findOne({ key });

        // --- Check 1: Prevent modification if current date is within the EXISTING active period ---
        if (existingSettings) {
            const existingStartDate = new Date(existingSettings.startDate);
            const existingEndDate = new Date(existingSettings.endDate);
            existingEndDate.setHours(23, 59, 59, 999); // Adjust end date for comparison

            if (currentDate >= existingStartDate && currentDate <= existingEndDate) {
                return res.status(403).json({ error: 'Cannot modify an active application period. Please wait until the period ends.' });
            }
        }

        // --- Check 2: Find any period that overlaps with the TARGET year ---
        const conflictSettings = await ApplicationPeriod.findOne({
            key: key,
            $or: [
                { startDate: { $gte: new Date(targetYear, 0, 1), $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999) } },
                { endDate: { $gte: new Date(targetYear, 0, 1), $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999) } }
            ]
        });

        // --- NEW Check 3: Prevent saving if a period for the target year already exists and is finished ---
        if (conflictSettings) {
            const conflictEndDate = new Date(conflictSettings.endDate);
            conflictEndDate.setHours(23, 59, 59, 999); // Ensure comparison includes the whole end day

            // Check if the current date is AFTER the end date of the conflicting period for the target year
            if (currentDate > conflictEndDate) {
                return res.status(403).json({ error: `An application period for ${targetYear} has already concluded. You cannot set a new period for this year.` });
            }
        }

        // --- Check 4 (Previously Check 2): Handle confirmation for overwriting non-finished conflicting periods ---
        // If a conflict exists AND it's different from the one we might be updating AND force flag is not set
        if (conflictSettings && (!existingSettings || existingSettings._id.toString() !== conflictSettings._id.toString()) && !force) {
             // Format existing dates for the message if overwriting a DIFFERENT record
             const existingStartFormatted = new Date(conflictSettings.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingEndFormatted = new Date(conflictSettings.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingRange = `${existingStartFormatted}-${existingEndFormatted}`;

             return res.status(409).json({
                 conflict: true,
                 message: `An application period (${existingRange}) already exists for ${targetYear}. Are you sure you want to overwrite it?`,
                 existingPeriod: conflictSettings
             });
        }
        // Also handle the case where we are updating the *same* record but it falls in the target year, still might need confirmation if not forced
         if (conflictSettings && existingSettings && existingSettings._id.toString() === conflictSettings._id.toString() && !force) {
             // Format existing dates for the message when modifying the SAME record
             const existingStartFormatted = new Date(existingSettings.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingEndFormatted = new Date(existingSettings.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingRange = `${existingStartFormatted}-${existingEndFormatted}`;

             return res.status(409).json({
                 conflict: true,
                 // Updated message format
                 message: `You are modifying the existing application period (${existingRange}) for ${targetYear}. Are you sure you want to proceed?`,
                 existingPeriod: conflictSettings // or existingSettings, they are the same here
             });
         }

        // --- Proceed with Save/Update ---
        if (existingSettings) {
            // Update existing settings
            existingSettings.startDate = newStartDate;
            existingSettings.endDate = newEndDate;
            await existingSettings.save();
            res.status(200).json({ message: 'Application period updated successfully.' });
        } else {
            // Create new settings
            const newSettings = new ApplicationPeriod({ key, startDate: newStartDate, endDate: newEndDate });
            await newSettings.save();
            res.status(201).json({ message: 'Application period created successfully.' });
        }

    } catch (error) {
        console.error('Error saving application period:', error);
        res.status(500).json({ error: 'Failed to save application period.' });
    }
};

module.exports.getApplicationPeriod = async (req, res) => {
    const { key } = req.query;
    try {
        if (!key) {
            return res.status(400).json({ error: 'Key is required to fetch route settings.' });
        }

        const applicationPeriod = await ApplicationPeriod.findOne({ key }); // Replace with your DB query
        if (!applicationPeriod) {
            return res.status(404).json({ message: 'Application period not found' });
        }
        res.json(applicationPeriod);
    } catch (error) {
        console.error('Error fetching application period:', error);
        res.status(500).json({ message: 'Server error' });
    }
};