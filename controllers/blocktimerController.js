const ApplyBlocktimer = require('../models/ApplyBlocktimer');

module.exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await ApplyBlocktimer.find(); // Fetch all submissions
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

module.exports.getSubmissionById = async (req, res) => {
    try {
        const submission = await ApplyBlocktimer.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(submission);
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
};