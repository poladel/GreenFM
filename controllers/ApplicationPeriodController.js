const ApplicationPeriod = require('../models/ApplicationPeriod');

exports.saveApplicationPeriod = async (req, res) => {
    const { key, year, startDate, endDate } = req.body;

    if (!key || !year || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields for Application Period (key, year, startDate, endDate).' });
    }

    const appStartDateParsed = new Date(startDate);
    const appEndDateParsed = new Date(endDate);
    const currentYear = parseInt(year, 10);

    if (isNaN(appStartDateParsed.getTime()) || isNaN(appEndDateParsed.getTime())) {
        return res.status(400).json({ error: 'Invalid date format provided for Application Period.' });
    }
     if (appEndDateParsed < appStartDateParsed) {
        return res.status(400).json({ error: 'Application end date cannot be before start date.' });
    }
    if (appStartDateParsed.getFullYear() !== currentYear || appEndDateParsed.getFullYear() !== currentYear) {
         return res.status(400).json({ error: `Application period dates must be within the specified year (${currentYear}).` });
    }

    try {
        const updatedAppPeriod = await ApplicationPeriod.findOneAndUpdate(
            { key: key, year: currentYear },
            { startDate: appStartDateParsed, endDate: appEndDateParsed },
            { new: true, upsert: true, runValidators: true }
        );

        // <<< Emit WebSocket event >>>
        if (req.io && updatedAppPeriod) {
             // Emit to all connected clients (or specific admin room if you have one)
             req.io.emit('applicationPeriodUpdated', updatedAppPeriod);
             console.log('Emitted applicationPeriodUpdated event');
        }
        // <<< End Emit >>>

        res.status(200).json({
            message: 'Application Period saved successfully.',
            applicationPeriod: updatedAppPeriod,
        });

    } catch (error) {
        console.error("Error saving Application Period:", error);
        // Add specific error handling if needed (e.g., duplicate key)
        res.status(500).json({ error: 'Failed to save Application Period.', details: error.message });
    }
};

// Ensure getApplicationPeriod is also correct
exports.getApplicationPeriod = async (req, res) => {
    const { key, year } = req.query;
    if (!key || !year) return res.status(400).json({ error: 'Key and year query parameters are required.' });
    try {
        const period = await ApplicationPeriod.findOne({ key, year: parseInt(year) });
        if (!period) return res.status(404).json({ message: 'Application period not found.' });
        res.json(period);
    } catch (error) {
        console.error("Error fetching application period:", error);
        res.status(500).json({ error: 'Error fetching application period.' });
    }
};