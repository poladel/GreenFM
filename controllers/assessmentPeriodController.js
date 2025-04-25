const AssessmentPeriod = require('../models/AssessmentPeriod');

// getAssessmentPeriod remains the same
module.exports.getAssessmentPeriod = async (req, res) => {
    const { key = 'GFMAssessment' } = req.query; // Use default key
    try {
        if (!key) {
            return res.status(400).json({ error: 'Key is required to fetch assessment period.' });
        }

        const assessmentPeriod = await AssessmentPeriod.findOne({ key });

        if (!assessmentPeriod) {
            // It's okay if not found, frontend should handle null
            return res.status(404).json({ message: 'Assessment period not found' });
        }
        res.json(assessmentPeriod);
    } catch (error) {
        console.error('Error fetching assessment period:', error);
        res.status(500).json({ message: 'Server error fetching assessment period' });
    }
};