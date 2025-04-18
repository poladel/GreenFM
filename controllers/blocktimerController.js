const ApplyBlocktimer = require('../models/ApplyBlocktimer');

module.exports.getSubmissions = async (req, res) => {
    try {
        const { schoolYear } = req.query;

        if (!schoolYear || typeof schoolYear !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid schoolYear parameter' });
        }

        const submissions = await ApplyBlocktimer.find({ schoolYear }).sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

module.exports.getSubmissionById = async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await ApplyBlocktimer.findById(id);

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json(submission);
    } catch (error) {
        console.error('Error fetching submission by ID:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
};

module.exports.patchSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedSubmission = await ApplyBlocktimer.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json(updatedSubmission);
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
};