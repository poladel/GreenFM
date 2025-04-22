const RouteSettings = require('../models/RouteSettings');

module.exports.saveRouteSettings = async (req, res) => {
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
        let settings = await RouteSettings.findOne({ key });
        if (settings) {
            // Update existing settings
            settings.startDate = startDate;
            settings.endDate = endDate;
        } else {
            // Create new settings
            settings = new RouteSettings({ key, startDate, endDate });
        }

        // Save to the database
        await settings.save();
        res.status(200).json({ message: 'Route settings saved successfully.' });
    } catch (error) {
        console.error('Error saving route settings:', error);
        res.status(500).json({ error: 'Failed to save route settings.' });
    }
};

module.exports.getRouteSettings = async (req, res) => {
    try {
        const { key } = req.query; // Get the key from the query string

        if (!key) {
            return res.status(400).json({ error: 'Key is required to fetch route settings.' });
        }

        const settings = await RouteSettings.findOne({ key }); // Fetch settings for the given key
        if (!settings) {
            return res.status(404).json({ error: 'No settings found for the specified key.' });
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching route settings:', error);
        res.status(500).json({ error: 'Failed to fetch route settings.' });
    }
};