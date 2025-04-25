const AssessmentPeriod = require("../models/AssessmentPeriod");

// --- Fetch Assessment Period (by year or latest overall) ---
module.exports.getAssessmentPeriod = async (req, res) => {
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
