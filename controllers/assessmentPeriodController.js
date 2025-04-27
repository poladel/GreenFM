const AssessmentPeriod = require('../models/AssessmentPeriod');
const ApplicationPeriod = require('../models/ApplicationPeriod'); // <<< ADD THIS

exports.getAssessmentPeriod = async (req, res) => {
    const { year } = req.query; // Add year query param
    try {
        let query = {};
        let sort = { updatedAt: -1 }; // Default sort (latest overall)

        if (year) {
            // If year is provided, filter by year and don't sort by update time
            query.year = parseInt(year, 10);
            sort = {}; // Remove default sort when filtering by year
            console.log(`Fetching AssessmentPeriod for year: ${year}`); // Log
        } else {
             console.log(`Fetching latest AssessmentPeriod overall`); // Log
        }

        const assessmentPeriod = await AssessmentPeriod.findOne(query).sort(sort);

        if (!assessmentPeriod) {
            const message = year ? `Assessment period not found for year ${year}` : `Assessment period not found`;
            return res.status(404).json({ message });
        }
        res.json(assessmentPeriod);
    } catch (error) {
        console.error("Error fetching assessment period:", error);
        res.status(500).json({
            message: "Server error fetching assessment period",
        });
    }
};

exports.saveAssessmentPeriod = async (req, res) => {
    const { year, startDate, endDate } = req.body;

    if (!year || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields (year, startDate, endDate).' });
    }

    const assessStartDateParsed = new Date(startDate);
    const assessEndDateParsed = new Date(endDate);
    const currentYear = parseInt(year, 10);

    if (isNaN(assessStartDateParsed.getTime()) || isNaN(assessEndDateParsed.getTime())) {
        return res.status(400).json({ error: 'Invalid date format provided for Assessment Period.' });
    }
    if (assessEndDateParsed < assessStartDateParsed) {
        return res.status(400).json({ error: 'Assessment end date cannot be before start date.' });
    }
    if (assessStartDateParsed.getFullYear() !== currentYear || assessEndDateParsed.getFullYear() !== currentYear) {
         return res.status(400).json({ error: `Assessment period dates must be within the specified year (${currentYear}).` });
    }

    try {
        // <<< ADD VALIDATION AGAINST APPLICATION PERIOD >>>
        // Fetch the application period for the same year (assuming key 'JoinGFM')
        const appPeriod = await ApplicationPeriod.findOne({ key: 'JoinGFM', year: currentYear });

        if (appPeriod && appPeriod.startDate && assessStartDateParsed <= appPeriod.startDate) {
            return res.status(400).json({
                error: `Assessment Period start date (${assessStartDateParsed.toLocaleDateString()}) must be after the Application Period start date (${appPeriod.startDate.toLocaleDateString()}).`
            });
        }
        // <<< END VALIDATION >>>

        const updatedPeriod = await AssessmentPeriod.findOneAndUpdate(
            { year: currentYear },
            { startDate: assessStartDateParsed, endDate: assessEndDateParsed },
            { new: true, upsert: true, runValidators: true }
        );

        // Emit WebSocket event if needed
        if (req.io && updatedPeriod) {
             req.io.emit('assessmentPeriodUpdated', updatedPeriod);
             console.log('Emitted assessmentPeriodUpdated event');
        }

        res.status(200).json({ message: 'Assessment Period saved successfully.', period: updatedPeriod });
    } catch (error) {
        console.error("Error saving Assessment Period:", error);
        if (error.code === 11000) {
             return res.status(409).json({ error: `An assessment period for the year ${year} already exists.` });
        }
        res.status(500).json({ error: 'Failed to save Assessment Period.', details: error.message });
    }
};
