const RouteSettings = require('../models/RouteSettings');

module.exports.checkRouteAvailability = (key) => {
    return async (req, res, next) => {
        try {
            const settings = await RouteSettings.findOne({ key });

            if (!settings) {
                if (key === 'JoinGFM') {
                    return res.status(403).json({
                        message: 'Applications for GFM Staff are currently closed. Check Home for announcements of the next application period.',
                        redirectUrl: '/' // Redirect to Home or any other page
                    });
                }
                return res.status(403).json({ message: 'This route is currently unavailable.' });
            }

            // Adjust current date to UTC+8
            const currentDate = new Date();
            const timezoneOffset = 8 * 60 * 60 * 1000; // +8 hours in milliseconds
            const adjustedCurrentDate = new Date(currentDate.getTime() + timezoneOffset);

            const startDate = new Date(settings.startDate);
            const endDate = new Date(settings.endDate);
            endDate.setHours(23, 59, 59, 999); // Extend the end date to the end of the day

            // Compare only the date portion
            const currentDateOnly = new Date(adjustedCurrentDate.toISOString().split('T')[0]);
            const startDateOnly = new Date(startDate.toISOString().split('T')[0]);
            const endDateOnly = new Date(endDate.toISOString().split('T')[0]);

            console.log('Adjusted Current Date (UTC+8):', currentDateOnly);
            console.log('Start Date (UTC):', startDateOnly);
            console.log('End Date (UTC):', endDateOnly);

            if (currentDateOnly < startDateOnly || currentDateOnly > endDateOnly) {
                if (key === 'JoinGFM') {
                    return res.status(403).json({
                        message: 'Applications for GFM Staff are currently closed. Check Home for announcements of the next application period.',
                        redirectUrl: '/' // Redirect to Home or any other page
                    });
                }
                return res.status(403).json({ message: 'This route is currently unavailable.' });
            }

            next();
        } catch (error) {
            console.error('Error checking route availability:', error);
            res.status(500).json({ message: 'Server error.' });
        }
    };
};