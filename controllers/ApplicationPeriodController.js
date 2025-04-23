const ApplicationPeriod = require('../models/ApplicationPeriod');

module.exports.saveApplicationPeriod = async (req, res) => {
    try {
        // Check if the user is an admin
        if (!req.user || req.user.roles !== 'Admin') {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }

        const { key, startDate, endDate } = req.body;

        // Validate the input
        if (!key || !startDate || !endDate) {
            return res.status(400).json({ error: 'Key, start date, and end date are required.' });
        }

        // Check if settings already exist for the given key
        let settings = await ApplicationPeriod.findOne({ key });
        if (settings) {
            // Update existing settings
            settings.startDate = startDate;
            settings.endDate = endDate;
        } else {
            // Create new settings
            settings = new ApplicationPeriod({ key, startDate, endDate });
        }

        // Save to the database
        await settings.save();
        res.status(200).json({ message: 'Route settings saved successfully.' });
    } catch (error) {
        console.error('Error saving route settings:', error);
        res.status(500).json({ error: 'Failed to save route settings.' });
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