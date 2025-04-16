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

module.exports.patchSubmission = async (req, res) => {
    try {
        const submission = await ApplyBlocktimer.findById(req.params.id);
        const { result } = req.body;

        // Update only the fields provided
        const updates = {};
        if (result) updates.result = result;

        const updatedSubmission = await ApplyBlocktimer.findByIdAndUpdate(submission, updates, {
            new: true, // Return the updated document
            runValidators: true // Ensure validation rules are applied
        });

        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ success: true, submission: updatedSubmission });
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
};