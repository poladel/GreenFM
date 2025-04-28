const ArchivesModel = require('../models/ArchivesModel');
const { checkAuth } = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Use checkAuth middleware to ensure the user is logged in before accessing the archive
exports.getArchive = async (req, res) => {
    try {
        // Destructure year, month, and date from query params
        const { year, month, date } = req.query;
        let filter = {};

        // Check if the user is logged in (via checkAuth middleware)
        if (!req.user) {
            return res.redirect('/login'); // If not logged in, redirect to login page
        }

        // Build the filter based on query parameters
        if (year) filter.year = parseInt(year);  // Ensuring year is treated as a number
        if (month) filter.month = parseInt(month);  // Ensuring month is treated as a number
        if (date) filter.date = parseInt(date);  // Ensuring date is treated as a number

        // Fetch videos based on the filter from the ArchivesModel
        const videos = await ArchivesModel.find(filter).sort({ date: -1 });

        // If no videos are found, log the info
        if (videos.length === 0) {
            console.log(`No videos found for the selected filters: Year: ${year}, Month: ${month}, Date: ${date}`);
        }

        // Get distinct values for year, month, and date to populate the filter dropdowns
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let i = 2002; i <= currentYear; i++) {
            years.push(i);  // Create an array of years from 2002 to the current year
        }

        const months = Array.from({ length: 12 }, (v, k) => k + 1);  // Months 1 to 12
        const dates = Array.from({ length: 31 }, (v, k) => k + 1);  // Dates 1 to 31

        // Log the fetched videos for debugging purposes (you may want to remove this in production)
        console.log('Fetched videos:', videos);

        // Render the 'archives' page and pass the videos, years, months, and query params (year, month, date)
        res.render('2-user/4-archives', { 
            videos, 
            years,  // Pass the generated years array to the view
            months,  // Pass months array (1 to 12) to the view
            dates,   // Pass dates array (1 to 31) to the view
            year,    // Pass selected year filter to the view
            month,   // Pass selected month filter to the view
            date,    // Pass selected date filter to the view
            title: 'Archives - Past Live Videos'  // Set title for the page
        });
    } catch (err) {
        // Log the error for debugging
        console.error('Error fetching videos:', err);

        // Send an error message to the user if something goes wrong
        res.status(500).render('error', { 
            message: 'An error occurred while fetching videos. Please try again later.' 
        });
    }
};
