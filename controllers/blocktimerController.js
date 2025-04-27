const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const User = require('../models/User'); // Keep if needed elsewhere, otherwise remove

module.exports.getSubmissions = async (req, res) => {
    try {
        const { schoolYear, result } = req.query;

        if (!schoolYear || typeof schoolYear !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid schoolYear parameter' });
        }

        const query = { schoolYear };
        // Adjust result query to handle lowercase if schema uses lowercase
        if (result && result !== 'All') {
             // Assuming schema enum uses lowercase: 'pending', 'accepted', 'rejected'
             query.result = result;
        }

        // Optional: Log the final query being used
        console.log("Fetching submissions with query:", query);

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
        // Extract both result and preferredSchedule from the body
        const { result, preferredSchedule } = req.body; // <-- Extract preferredSchedule too

        // Validate the result value (check against lowercase)
        // Ensure these match your Mongoose schema enum values if applicable
        if (!result || !['pending', 'accepted', 'rejected'].includes(result)) { // <-- Change to lowercase check
             return res.status(400).json({ error: 'Invalid result value provided.' });
        }

        // Optional: Add basic validation for preferredSchedule
        if (!preferredSchedule || typeof preferredSchedule.day !== 'string' || typeof preferredSchedule.time !== 'string' || preferredSchedule.day.trim() === '' || preferredSchedule.time.trim() === '') {
            return res.status(400).json({ error: 'Invalid or missing preferredSchedule data.' });
        }


        console.log('ID:', id);
        console.log('Updating result to:', result);
        console.log('Updating preferredSchedule to:', preferredSchedule); // <-- Log preferredSchedule

        // Update both result and preferredSchedule fields
        const updatedSubmission = await ApplyBlocktimer.findByIdAndUpdate(
            id,
            {
                result: result, // Use the validated lowercase result
                preferredSchedule: { // Update preferredSchedule subdocument
                    day: preferredSchedule.day,
                    time: preferredSchedule.time
                }
            },
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        console.log('Updated Submission:', updatedSubmission);

        res.json({ message: 'Submission updated successfully.', submission: updatedSubmission });
    } catch (error) {
        console.error('Error updating submission:', error.message, error.stack);
        // Check for specific validation errors from Mongoose
        if (error.name === 'ValidationError') {
            // Extract a more specific message if possible
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') || 'Validation failed.' });
        }
        res.status(500).json({ error: 'Failed to update submission' });
    }
};