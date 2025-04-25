const ApplicationPeriod = require('../models/ApplicationPeriod');
const AssessmentPeriod = require('../models/AssessmentPeriod');

// --- Helper to parse date string to local midnight ---
const parseDateStringToLocalMidnight = (dateStr) => {
    if (!dateStr) return new Date(NaN);
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(NaN);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(NaN);
    return new Date(year, month, day); // Creates local midnight
};
// --- End Helper ---

// --- Modified saveApplicationPeriod ---
module.exports.saveApplicationPeriod = async (req, res) => {
    try {
        if (!req.user || !req.user.roles.includes('Admin')) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }

        const {
            appKey = 'JoinGFM', appStartDate: appStartDateStr, appEndDate: appEndDateStr,
            assessStartDate: assessStartDateStr, assessEndDate: assessEndDateStr,
            force = false
        } = req.body;

        // --- Validate Input Dates ---
        if (!appStartDateStr || !appEndDateStr || !assessStartDateStr || !assessEndDateStr) {
            return res.status(400).json({ error: 'All start and end dates for both periods are required.' });
        }

        // --- Parse Dates ---
        const appStartDate = parseDateStringToLocalMidnight(appStartDateStr);
        const appEndDate = parseDateStringToLocalMidnight(appEndDateStr);
        const assessStartDate = parseDateStringToLocalMidnight(assessStartDateStr);
        const assessEndDate = parseDateStringToLocalMidnight(assessEndDateStr);
        const currentDateTime = new Date();
        const currentDayStart = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate());

        // --- Basic Date Logic Validation ---
        if (isNaN(appStartDate.getTime()) || isNaN(appEndDate.getTime()) || isNaN(assessStartDate.getTime()) || isNaN(assessEndDate.getTime())) {
             return res.status(400).json({ error: 'Invalid date format provided.' });
        }
        // Check if start date is before today (Requirement 1 for update is implicitly covered here)
        if (appStartDate < currentDayStart) {
             return res.status(400).json({ error: 'Application Period start date cannot be set before the current date.' });
        }
        if (appEndDate < appStartDate) {
            return res.status(400).json({ error: 'Application End Date cannot be before Application Start Date.' });
        }
        if (assessEndDate < assessStartDate) {
            return res.status(400).json({ error: 'Assessment End Date cannot be before Assessment Start Date.' });
        }
        // Check if Assessment starts ON or BEFORE Application starts
        if (assessStartDate <= appStartDate) {
             return res.status(400).json({ error: 'Assessment Period start date must be scheduled later than the Application Period start date.' });
        }
        // Check if Assessment ends before Application ends
        if (assessEndDate < appEndDate) {
             return res.status(400).json({ error: 'Assessment Period end date must be on or after the Application Period end date.' });
        }
        // --- End Basic Date Validation ---

        const targetYear = appStartDate.getFullYear();
        const assessTargetYear = assessStartDate.getFullYear();

        // --- Conflict Checks ---

        // 1. Overall Active Period Check: Block modification if ANY period is currently active.
        // This prevents changing settings (even for future years) while applications might be open.
        const latestOverallPeriod = await ApplicationPeriod.findOne({ key: appKey, endDate: { $gte: currentDayStart } }).sort({ endDate: -1 });
        if (latestOverallPeriod) {
            const latestStart = parseDateStringToLocalMidnight(latestOverallPeriod.startDate.toISOString().split('T')[0]);
            const latestEnd = parseDateStringToLocalMidnight(latestOverallPeriod.endDate.toISOString().split('T')[0]);
            if (currentDayStart >= latestStart && currentDayStart <= latestEnd) {
                 return res.status(409).json({
                     conflict: true,
                     type: 'active_period_overall', // Specific type for frontend
                     message: 'Cannot modify period settings while an application period is active.'
                 });
            }
        }

        // 2. Specific Year Check (Only relevant if not forcing overwrite)
        if (!force) {
            const existingPeriodForYear = await ApplicationPeriod.findOne({ key: appKey, year: targetYear });

            if (existingPeriodForYear) {
                const existingStartForYear = parseDateStringToLocalMidnight(existingPeriodForYear.startDate.toISOString().split('T')[0]);
                const existingEndForYear = parseDateStringToLocalMidnight(existingPeriodForYear.endDate.toISOString().split('T')[0]);

                // --- FIX: Check if existing period for the target year has started ---
                // Requirement 2: Block update if the existing period has already started.
                if (currentDayStart >= existingStartForYear) {
                     // Check if it has also concluded (for a more specific message)
                     if (currentDayStart > existingEndForYear) {
                         // It has concluded - requires force to overwrite
                         return res.status(409).json({
                             conflict: true,
                             type: 'concluded_period', // Type for frontend
                             message: `An application period for ${targetYear} has already concluded. Overwriting requires confirmation.`
                         });
                     } else {
                         // It has started but not concluded (it's active) - Block update
                         return res.status(409).json({
                             conflict: true,
                             type: 'active_period_specific', // Type for frontend
                             message: `The application period for ${targetYear} has already started. It cannot be modified at this time.`
                         });
                     }
                } else {
                    // Existing period for the year exists but hasn't started yet (it's in the future).
                    // Allow update (updateOne below will replace it), but maybe ask for confirmation?
                    // Let's treat replacing a future, unstarted period as requiring confirmation.
                     return res.status(409).json({
                        conflict: true,
                        type: 'replace_future', // Type for frontend
                        message: `An application period for ${targetYear} already exists (${existingPeriodForYear.startDate.toLocaleDateString()} - ${existingPeriodForYear.endDate.toLocaleDateString()}) but has not started. Do you want to replace it?`
                    });
                }
                // --- End FIX ---
            }
            // If no existingPeriodForYear, it's a clean insert for this year, proceed without conflict.
        }
        // --- End Conflict Checks ---

        // --- Proceed with Save/Update ---
        console.log(`Attempting save/update. Force: ${force}, Target Year: ${targetYear}, Assess Target Year: ${assessTargetYear}`);

        try { // Nested try...catch around the updates
            // --- Save/Update Application Period using findOneAndUpdate ---
            console.log('App Filter:', { key: appKey, year: targetYear });
            const appUpdateData = { startDate: appStartDateStr, endDate: appEndDateStr, key: appKey, year: targetYear }; // Data for set/insert
            console.log('App Data:', appUpdateData);
            const appUpdateResult = await ApplicationPeriod.findOneAndUpdate(
                { key: appKey, year: targetYear }, // Filter
                appUpdateData, // Use the full data object, findOneAndUpdate handles $set implicitly on update
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true } // Options: upsert, return new doc, run validators, set defaults
            );
            console.log('App Update Result:', appUpdateResult ? 'Document updated/inserted' : 'Update failed or no document found/created');


            // --- Save/Update Assessment Period using findOneAndUpdate (Filter by YEAR only) ---
            console.log('Assess Filter:', { year: assessTargetYear }); // Filter by year
            const assessUpdateData = { startDate: assessStartDateStr, endDate: assessEndDateStr, year: assessTargetYear }; // Data without key
            console.log('Assess Data:', assessUpdateData);
            const assessUpdateResult = await AssessmentPeriod.findOneAndUpdate(
                { year: assessTargetYear }, // Filter by year
                assessUpdateData,
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true } // Options
            );
            console.log('Assess Update Result:', assessUpdateResult ? 'Document updated/inserted' : 'Update failed or no document found/created');

            // Check if updates were successful (findOneAndUpdate returns the doc or null)
            if (!appUpdateResult || !assessUpdateResult) {
                 // Throw an error if either operation failed unexpectedly (other than index error which should be caught below)
                 throw new Error('Failed to update/insert one or both period documents.');
            }

            // --- Determine Response Message ---
            // Simplified message as findOneAndUpdate doesn't give counts easily
            let message = "Application and Assessment Periods processed successfully.";

            // Send 200 OK on success (can't easily determine 201 Created vs 200 OK here)
            res.status(200).json({ message });

        } catch (updateError) {
             // Catch errors specifically from the findOneAndUpdate calls
             console.error('ERROR DURING findOneAndUpdate:', updateError); // Log the specific update error
             // Check for unique index violation on 'year' for AssessmentPeriod
             if (updateError.code === 11000 && updateError.message.includes('assessmentperiods') && updateError.message.includes('year')) {
                 return res.status(409).json({ error: `An assessment period for the year ${assessTargetYear} already exists.` });
             }
             // Re-throw other errors or handle ApplicationPeriod 11000 error
             throw updateError;
        }

    } catch (error) { // Outer catch block
        console.error('Error saving periods (Outer Catch):', error); // Log error in outer catch
        // Handle ApplicationPeriod 11000 error if re-thrown from inner catch
        if (error.code === 11000 && error.message.includes('applicationperiods')) {
             return res.status(409).json({ error: `An application period for key ${appKey} and year ${targetYear} already exists.` });
        }
        // Handle AssessmentPeriod 11000 error if re-thrown from inner catch (redundant but safe)
        if (error.code === 11000 && error.message.includes('assessmentperiods') && error.message.includes('year')) {
             return res.status(409).json({ error: `An assessment period for the year ${assessTargetYear} already exists.` });
        }
        res.status(500).json({ error: 'Failed to save periods.' });
    }
};

// --- getApplicationPeriod ---
module.exports.getApplicationPeriod = async (req, res) => {
    const { key = 'JoinGFM', year } = req.query; // Add year query param
    try {
        let query = { key };
        let sort = { updatedAt: -1 }; // Default sort (latest overall)

        if (year) {
            // If year is provided, filter by year and don't sort by update time
            query.year = parseInt(year, 10);
            sort = {}; // Remove default sort when filtering by year
            console.log(`Fetching ApplicationPeriod for key: ${key}, year: ${year}`); // Log
        } else {
            console.log(`Fetching latest ApplicationPeriod for key: ${key}`); // Log
        }

        const applicationPeriod = await ApplicationPeriod.findOne(query).sort(sort);

        if (!applicationPeriod) {
            const message = year ? `Application period not found for key ${key} and year ${year}` : `Application period not found for key ${key}`;
            return res.status(404).json({ message });
        }
        res.json(applicationPeriod);
    } catch (error) {
        console.error('Error fetching application period:', error);
        res.status(500).json({ message: 'Server error' });
    }
};