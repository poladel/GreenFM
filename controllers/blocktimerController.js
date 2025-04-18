const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const User = require('../models/User');

module.exports.getSubmissions = async (req, res) => {
    try {
        const { schoolYear, result } = req.query;

        if (!schoolYear || typeof schoolYear !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid schoolYear parameter' });
        }

        const query = { schoolYear };
        if (result) query.status = result;

        const submissions = await ApplyBlocktimer.find(query).sort({ createdAt: -1 });
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

        console.log('ID:', id);
        console.log('Updates:', updates);

        // Update the submission
        const updatedSubmission = await ApplyBlocktimer.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        console.log('Updated Submission:', updatedSubmission);

        // If the result is patched to "Accepted" or "Rejected" or "Accept", update the user's fields
        if (updates.result === 'Accept' || updates.result === 'Reject') {
            const email = updatedSubmission.submittedBy; // Assuming `submittedBy` contains the user's email
            console.log('Updating user with email:', email);

            const userUpdate = await User.findOneAndUpdate(
                { email }, // Query by email
                {
                    completedBlocktimerStep1: false,
                    completedBlocktimerStep2: false,
                }
            );

            if (!userUpdate) {
                console.error('User not found for email:', email);
                return res.status(404).json({ error: 'User not found' });
            }

            console.log('User updated successfully:', userUpdate);
        }

        res.json(updatedSubmission);
    } catch (error) {
        console.error('Error updating submission:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to update submission' });
    }
};