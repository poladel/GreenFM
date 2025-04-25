const AssessmentPeriod = require("../models/AssessmentPeriod");

// --- Fetch the LATEST assessment period overall by update time ---
module.exports.getAssessmentPeriod = async (req, res) => {
    // const { key = "GFMAssessment" } = req.query; // REMOVED key query param
    try {
        // Find the single most recently updated document in the collection
        const assessmentPeriod = await AssessmentPeriod.findOne({}) // Empty filter
                                                     .sort({ updatedAt: -1 }); // Sort by updatedAt descending

        if (!assessmentPeriod) {
            return res
                .status(404)
                .json({ message: "Assessment period not found" });
        }
        res.json(assessmentPeriod);
    } catch (error) {
        console.error("Error fetching assessment period:", error);
        res.status(500).json({
            message: "Server error fetching assessment period",
        });
    }
};
// --- End Change ---
