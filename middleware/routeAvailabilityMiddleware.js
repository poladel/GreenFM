const RouteSettings = require('../models/ApplicationPeriod');

module.exports.checkRouteAvailability = (key) => {
    return async (req, res, next) => {
        try {
            console.log(`Checking route availability for key: ${key}`); // Debugging
            const settings = await RouteSettings.findOne({ key });

            if (!settings) {
                console.log(`No settings found for key: ${key}`); // Debugging
                return renderRestricted('This route is currently unavailable.', res);
            }

            const currentDate = new Date();
            const timezoneOffset = 8 * 60 * 60 * 1000; // +8 hours in milliseconds
            const adjustedCurrentDate = new Date(currentDate.getTime() + timezoneOffset);

            const startDate = new Date(settings.startDate);
            const endDate = new Date(settings.endDate);
            endDate.setHours(23, 59, 59, 999); // Extend the end date to the end of the day

            console.log('Adjusted Current Date (UTC+8):', adjustedCurrentDate); // Debugging
            console.log('Start Date (UTC):', startDate); // Debugging
            console.log('End Date (UTC):', endDate); // Debugging

            if (adjustedCurrentDate < startDate || adjustedCurrentDate > endDate) {
                console.log(`Route is unavailable for key: ${key}`); // Debugging
                const message = key === 'JoinGFM'
                    ? 'Applications for GFM Staff are currently closed. Check Home for announcements of the next application period.'
                    : 'This route is currently unavailable.';
                return renderRestricted(message, res);
            }

            console.log(`Route is available for key: ${key}`); // Debugging
            next(); // Proceed to the next middleware or route handler if the route is available
        } catch (error) {
            console.error('Error checking route availability:', error);
            return renderRestricted('Server error. Please try again later.', res, 500);
        }
    };
};

// Helper function to render the restricted page
function renderRestricted(message, res, statusCode = 200) {
    return res.status(statusCode).render('restricted', {
        message,
        redirectUrl: '/'
    });
}