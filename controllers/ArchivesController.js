const ArchivesModel = require('../models/ArchivesModel');
const { checkAuth } = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Use checkAuth middleware to ensure the user is logged in before accessing the archive
exports.getArchive = async (req, res) => {
    try {
        // Destructure year, month, and date from query params
        const { year, month, date } = req.query;
        let filter = {};

        // Check authentication status
        if (!req.user) {
            return res.redirect('/login');
        }

        // Build the filter based on query parameters
        if (year) filter.year = parseInt(year); // Ensuring year is treated as a number
        if (month) filter.month = parseInt(month); // Ensuring month is treated as a number
        if (date) filter.date = parseInt(date); // Ensuring date is treated as a number

        // Fetch videos based on the filter from the ArchivesModel
        const videos = await ArchivesModel.find(filter).sort({ date: -1 });

        // If no videos are found, log the info
        if (videos.length === 0) {
            console.log(`No videos found for the selected filters: Year: ${year}, Month: ${month}, Date: ${date}`);
        }

        // Log the fetched videos for debugging purposes (you may want to remove this in production)
        console.log('Fetched videos:', videos);

        // Render the 'archives' page and pass the videos and query params (year, month, date)
        res.render('2-user/4-archives', { videos, year, month, date });
    } catch (err) {
        // Log error for debugging
        console.error('Error fetching videos:', err);

        // Send an error message to the user if something goes wrong
        res.status(500).render('error', { message: 'An error occurred while fetching videos. Please try again later.' });
    }
};
