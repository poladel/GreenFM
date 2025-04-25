const ApplicationPeriod = require('../models/ApplicationPeriod');
const AssessmentPeriod = require('../models/AssessmentPeriod'); // Import AssessmentPeriod model

// Helper function for date comparison (ignoring time)
const isSameOrAfter = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1 >= d2;
};

// --- Modified to save BOTH periods ---
module.exports.saveApplicationPeriod = async (req, res) => {
    try {
        if (!req.user || !req.user.roles.includes('Admin')) { // Check if roles array includes 'Admin'
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }

        const {
            appKey = 'JoinGFM', appStartDate: appStartDateStr, appEndDate: appEndDateStr,
            assessKey = 'GFMAssessment', assessStartDate: assessStartDateStr, assessEndDate: assessEndDateStr,
            force = false // Get force flag
        } = req.body;

        // --- Validate Input Dates ---
        if (!appStartDateStr || !appEndDateStr || !assessStartDateStr || !assessEndDateStr) {
            return res.status(400).json({ error: 'All start and end dates for both periods are required.' });
        }

        const appStartDate = new Date(appStartDateStr);
        const appEndDate = new Date(appEndDateStr);
        const assessStartDate = new Date(assessStartDateStr);
        const assessEndDate = new Date(assessEndDateStr);

        if (isNaN(appStartDate.getTime()) || isNaN(appEndDate.getTime()) || isNaN(assessStartDate.getTime()) || isNaN(assessEndDate.getTime())) {
             return res.status(400).json({ error: 'Invalid date format provided.' });
        }
        if (appEndDate < appStartDate) {
            return res.status(400).json({ error: 'Application End Date cannot be before Application Start Date.' });
        }
        if (assessEndDate < assessStartDate) {
            return res.status(400).json({ error: 'Assessment End Date cannot be before Assessment Start Date.' });
        }
        // *** The Core Check ***
        if (assessStartDate < appStartDate) {
             return res.status(400).json({ error: 'Assessment Period start date must be on or after the Application Period start date.' });
        }

        // --- Conflict/Overwrite Checks (Focus on Application Period for now) ---
        const existingAppPeriod = await ApplicationPeriod.findOne({ key: appKey });
        const currentDateTime = new Date();

        if (!force && existingAppPeriod) {
            const existingAppStart = new Date(existingAppPeriod.startDate);
            const existingAppEnd = new Date(existingAppPeriod.endDate);

            // Check if trying to set a period for a year that already has a concluded period
            if (appStartDate.getFullYear() === existingAppStart.getFullYear() && currentDateTime > existingAppEnd) {
                 return res.status(409).json({
                     conflict: true,
                     message: `An application period for ${appStartDate.getFullYear()} has already concluded. Overwriting is generally not recommended.`
                 });
            }
            // Check if trying to modify during an active period
            if (currentDateTime >= existingAppStart && currentDateTime <= existingAppEnd) {
                 return res.status(409).json({ // Use 409 Conflict
                     conflict: true, // Indicate it's a conflict the user might override
                     message: 'Cannot modify period settings during an active application period.'
                 });
            }
            // Add more specific overlap checks if needed
        }
        // --- End Conflict Checks ---

        // --- Save/Update Application Period ---
        const appUpdateResult = await ApplicationPeriod.updateOne(
            { key: appKey },
            { $set: { startDate: appStartDate, endDate: appEndDate, key: appKey } },
            { upsert: true }
        );

        // --- Save/Update Assessment Period ---
        const assessUpdateResult = await AssessmentPeriod.updateOne(
            { key: assessKey },
            { $set: { startDate: assessStartDate, endDate: assessEndDate, key: assessKey } },
            { upsert: true }
        );

        // --- Determine Response Message ---
        let message = "Application and Assessment Periods saved successfully.";
        if (appUpdateResult.upsertedCount > 0 || assessUpdateResult.upsertedCount > 0) {
            message = "Application and Assessment Periods created successfully.";
        } else if (appUpdateResult.modifiedCount > 0 || assessUpdateResult.modifiedCount > 0) {
            message = "Application and Assessment Periods updated successfully.";
        }

        res.status(appUpdateResult.upsertedCount > 0 || assessUpdateResult.upsertedCount > 0 ? 201 : 200).json({ message });

    } catch (error) {
        console.error('Error saving periods:', error);
        res.status(500).json({ error: 'Failed to save periods.' });
    }
};

// getApplicationPeriod remains the same
module.exports.getApplicationPeriod = async (req, res) => {
    const { key } = req.query;
    try {
        if (!key) {
            return res.status(400).json({ error: 'Key is required to fetch route settings.' });
        }
        const applicationPeriod = await ApplicationPeriod.findOne({ key }).sort({ updatedAt: -1 });
        if (!applicationPeriod) {
            return res.status(404).json({ message: 'Application period not found' });
        }
        res.json(applicationPeriod);
    } catch (error) {
        console.error('Error fetching application period:', error);
        res.status(500).json({ message: 'Server error' });
    }
};