const ApplicationPeriod = require('../models/ApplicationPeriod');

module.exports.saveApplicationPeriod = async (req, res) => {
    try {
        // ... (user auth, body parsing, basic date validation remain the same) ...
        if (!req.user || req.user.roles !== 'Admin') {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        const { key, startDate: newStartDateStr, endDate: newEndDateStr, force } = req.body;
        if (!key || !newStartDateStr || !newEndDateStr) {
            return res.status(400).json({ error: 'Key, start date, and end date are required.' });
        }
        const newStartDate = new Date(newStartDateStr);
        const newEndDate = new Date(newEndDateStr);
        const currentDate = new Date(); // Get current date/time
        // --- Normalize currentDate to the START of its day (local time) for comparison ---
        const currentDayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
             return res.status(400).json({ error: 'Invalid date format provided.' });
        }
        if (newEndDate < newStartDate) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }
        const targetYear = newStartDate.getFullYear();

        // --- Find ANY period for the target year ---
        const periodInTargetYear = await ApplicationPeriod.findOne({
            key: key,
            $or: [
                { startDate: { $gte: new Date(targetYear, 0, 1), $lt: new Date(targetYear + 1, 0, 1) } },
                { endDate: { $gte: new Date(targetYear, 0, 1), $lt: new Date(targetYear + 1, 0, 1) } }
            ]
        });

        // --- Find the latest period matching the key ---
        let periodToUpdate = await ApplicationPeriod.findOne({ key }).sort({ updatedAt: -1 }); // Get latest

        // --- Helper function for date comparison (ignoring time) ---
        const isSameOrAfter = (date1, date2) => {
            const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
            const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
            return d1 >= d2;
        };
        const isAfter = (date1, date2) => {
            const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
            const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
            return d1 > d2;
        };
        const isSameOrBefore = (date1, date2) => {
             const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
             const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
             return d1 <= d2;
        };


        // --- Check 1: Prevent modification if ANY period (the latest one) is currently active ---
        if (periodToUpdate) {
            const existingStartDate = new Date(periodToUpdate.startDate);
            const existingEndDate = new Date(periodToUpdate.endDate);

            // Compare using date parts only
            if (isSameOrAfter(currentDayStart, existingStartDate) && isSameOrBefore(currentDayStart, existingEndDate)) {
                return res.status(403).json({ error: 'Cannot modify settings during an active application period. Please wait until the period ends.' });
            }
        }

        // --- Check 2: Prevent saving if a period for the target year already exists and is finished ---
        if (periodInTargetYear) {
            const conflictEndDate = new Date(periodInTargetYear.endDate);
            // Compare using date parts only
            if (isAfter(currentDayStart, conflictEndDate)) {
                return res.status(403).json({ error: `An application period for ${targetYear} has already concluded. You cannot set a new period for this year.` });
            }
        }

        // --- Determine Action: Create or Update ---
        let action = 'create'; // Default action
        if (periodToUpdate) {
            const existingStartDate = new Date(periodToUpdate.startDate); // Get date object
            if (existingStartDate.getFullYear() === targetYear) { // Compare year from date object
                action = 'update';
            }
        }


        // --- Check 3: If updating, prevent if the existing period has already started ---
        if (action === 'update') {
            const existingStartDate = new Date(periodToUpdate.startDate);
            // Compare using date parts only
            if (isSameOrAfter(currentDayStart, existingStartDate)) {
                 return res.status(403).json({ error: `Cannot update the application period for ${targetYear} because it has already started or is active.` });
            }
        }

        // --- Check 4: Handle confirmation for overwriting/modifying in the target year ---
        // ... (rest of the conflict check logic remains the same) ...
        if (periodInTargetYear && !force) {
             const existingStartFormatted = new Date(periodInTargetYear.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingEndFormatted = new Date(periodInTargetYear.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
             const existingRange = `${existingStartFormatted}-${existingEndFormatted}`;
             let message = '';

             if (action === 'update' && periodToUpdate._id.toString() === periodInTargetYear._id.toString()) {
                 message = `You are modifying the existing application period (${existingRange}) for ${targetYear}. Are you sure you want to proceed?`;
             } else {
                 message = `An application period (${existingRange}) already exists for ${targetYear}. Are you sure you want to overwrite it?`;
             }

             return res.status(409).json({
                 conflict: true,
                 message: message,
                 existingPeriod: periodInTargetYear
             });
        }


        // --- Proceed with Save/Update ---
        // ... (save/update logic remains the same) ...
        if (action === 'update') {
            periodToUpdate.startDate = newStartDate;
            periodToUpdate.endDate = newEndDate;
            await periodToUpdate.save();
            res.status(200).json({ message: `Application period for ${targetYear} updated successfully.` });
        } else { // action === 'create'
            const newSettings = new ApplicationPeriod({ key, startDate: newStartDate, endDate: newEndDate });
            await newSettings.save();
            res.status(201).json({ message: `Application period for ${targetYear} created successfully.` });
        }

    } catch (error) {
        console.error('Error saving application period:', error);
        res.status(500).json({ error: 'Failed to save application period.' });
    }
};

// --- getApplicationPeriod remains the same ---
// ... (code for getApplicationPeriod) ...
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