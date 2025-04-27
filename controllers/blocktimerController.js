const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const Schedule = require('../models/Schedule');
const User = require('../models/User'); // Assuming User model is needed if fetching user details
const sendEmail = require('../config/mailer'); // Verify this path is correct

module.exports.getSubmissions = async (req, res) => {
	try {
		const { schoolYear, result } = req.query;

		if (!schoolYear || typeof schoolYear !== "string") {
			return res
				.status(400)
				.json({ error: "Missing or invalid schoolYear parameter" });
		}

		const query = { schoolYear };
		// Adjust result query to handle lowercase if schema uses lowercase
		if (result && result !== "All") {
			// Assuming schema enum uses lowercase: 'pending', 'accepted', 'rejected'
			query.result = result;
		}

		// Optional: Log the final query being used
		console.log("Fetching submissions with query:", query);

		const submissions = await ApplyBlocktimer.find(query).sort({
			createdAt: -1,
		});
		res.json(submissions);
	} catch (error) {
		console.error("Error fetching submissions:", error);
		res.status(500).json({ error: "Failed to fetch submissions" });
	}
};

module.exports.getSubmissionById = async (req, res) => {
	try {
		const { id } = req.params;

		const submission = await ApplyBlocktimer.findById(id);

		if (!submission) {
			return res.status(404).json({ error: "Submission not found" });
		}

		res.json(submission);
	} catch (error) {
		console.error("Error fetching submission by ID:", error);
		res.status(500).json({ error: "Failed to fetch submission" });
	}
};

module.exports.patchSubmission = async (req, res) => {
	try {
		const { id } = req.params;
		// Extract both result and preferredSchedule from the body
		const { result, preferredSchedule } = req.body; // <-- Extract preferredSchedule too

		// Validate the result value (check against lowercase)
		// Ensure these match your Mongoose schema enum values if applicable
		if (!result || !["pending", "accepted", "rejected"].includes(result)) {
			// <-- Change to lowercase check
			return res
				.status(400)
				.json({ error: "Invalid result value provided." });
		}

		// Optional: Add basic validation for preferredSchedule
		if (
			!preferredSchedule ||
			typeof preferredSchedule.day !== "string" ||
			typeof preferredSchedule.time !== "string" ||
			preferredSchedule.day.trim() === "" ||
			preferredSchedule.time.trim() === ""
		) {
			return res
				.status(400)
				.json({ error: "Invalid or missing preferredSchedule data." });
		}

		console.log("ID:", id);
		console.log("Updating result to:", result);
		console.log("Updating preferredSchedule to:", preferredSchedule); // <-- Log preferredSchedule

		// Update both result and preferredSchedule fields
		const updatedSubmission = await ApplyBlocktimer.findByIdAndUpdate(
			id,
			{
				result: result, // Use the validated lowercase result
				preferredSchedule: {
					// Update preferredSchedule subdocument
					day: preferredSchedule.day,
					time: preferredSchedule.time,
				},
			},
			{ new: true, runValidators: true } // Return the updated document and run validators
		);

		if (!updatedSubmission) {
			return res.status(404).json({ error: "Submission not found" });
		}

		console.log("Updated Submission:", updatedSubmission);

		res.json({
			message: "Submission updated successfully.",
			submission: updatedSubmission,
		});
	} catch (error) {
		console.error("Error updating submission:", error.message, error.stack);
		// Check for specific validation errors from Mongoose
		if (error.name === "ValidationError") {
			// Extract a more specific message if possible
			const messages = Object.values(error.errors).map(
				(val) => val.message
			);
			return res
				.status(400)
				.json({ error: messages.join(", ") || "Validation failed." });
		}
		res.status(500).json({ error: "Failed to update submission" });
	}
};

module.exports.confirmSchedule = async (req, res) => {
	const { id: submissionId } = req.params;
	const userEmail = req.user.email; // Assuming requireAuth adds user to req

	try {
		const submission = await ApplyBlocktimer.findById(submissionId);
		if (!submission || submission.submittedBy !== userEmail) {
			return res
				.status(404)
				.json({ message: "Submission not found or access denied." });
		}
		if (submission.result !== "Accepted") {
			return res
				.status(400)
				.json({ message: "Submission is not in an accepted state." });
		}

		// Find the associated schedule and update its status
		const schedule = await Schedule.findOne({
			submissionId: submission._id,
		});
		if (!schedule) {
			return res
				.status(404)
				.json({ message: "Associated schedule not found." });
		}
		if (schedule.confirmationStatus !== "Pending Confirmation") {
			return res
				.status(400)
				.json({
					message:
						"Schedule does not require confirmation or already confirmed.",
				});
		}

		schedule.confirmationStatus = "Accepted";
		await schedule.save();

		// Reset user progress flags
		const user = await User.findOne({ email: userEmail });
		if (user) {
			user.completedBlocktimerStep1 = false;
			user.completedBlocktimerStep2 = false;
			await user.save();
		}

		res.status(200).json({ message: "Schedule confirmed successfully." });
	} catch (error) {
		console.error("Error confirming schedule:", error);
		res.status(500).json({ message: "Server error confirming schedule." });
	}
};

module.exports.rejectScheduleChange = async (req, res) => {
	const { id: submissionId } = req.params;
	const userEmail = req.user.email;

	try {
		const submission = await ApplyBlocktimer.findById(submissionId);
		if (!submission || submission.submittedBy !== userEmail) {
			return res
				.status(404)
				.json({ message: "Submission not found or access denied." });
		}
		if (submission.result !== "Accepted") {
			return res
				.status(400)
				.json({ message: "Submission is not in an accepted state." });
		}

		// Revert submission status (optional, could just delete schedule)
		// submission.result = 'Pending'; // Or a new status like 'Schedule_Rejected'
		// await submission.save();

		// Delete the schedule that was pending confirmation
		const deletedSchedule = await Schedule.findOneAndDelete({
			submissionId: submission._id,
			confirmationStatus: "Pending Confirmation",
		});

		if (!deletedSchedule) {
			return res
				.status(404)
				.json({
					message:
						"No schedule pending confirmation found to reject.",
				});
		}
		console.log(
			`Deleted schedule ${deletedSchedule._id} due to user rejection of change.`
		);

		// Reset user progress flags
		const user = await User.findOne({ email: userEmail });
		if (user) {
			user.completedBlocktimerStep1 = false;
			user.completedBlocktimerStep2 = false;
			await user.save();
		}

		res.status(200).json({
			message:
				"Schedule change rejected. Please contact admin if you wish to proceed.",
		});
	} catch (error) {
		console.error("Error rejecting schedule change:", error);
		res.status(500).json({
			message: "Server error rejecting schedule change.",
		});
	}
};

module.exports.acknowledgeResult = async (req, res) => {
	const { id: submissionId } = req.params;
	const userEmail = req.user.email;

	try {
		const submission = await ApplyBlocktimer.findById(submissionId);
		if (!submission || submission.submittedBy !== userEmail) {
			return res
				.status(404)
				.json({ message: "Submission not found or access denied." });
		}
		// Optionally check if result is 'Rejected' if this is only for rejections
		// if (submission.result !== 'Rejected') { ... }

		// Reset user progress flags
		const user = await User.findOne({ email: userEmail });
		if (user) {
			user.completedBlocktimerStep1 = false;
			user.completedBlocktimerStep2 = false;
			await user.save();
		}

		res.status(200).json({ message: "Result acknowledged." });
	} catch (error) {
		console.error("Error acknowledging result:", error);
		res.status(500).json({ message: "Server error acknowledging result." });
	}
};

// --- NEW FUNCTION ---
module.exports.getMyLatestSubmission = async (req, res) => {
    const userEmail = req.user.email; // Assuming requireAuth adds user to req

    try {
        const submission = await ApplyBlocktimer.findOne({ submittedBy: userEmail })
            .sort({ createdAt: -1 }) // Sort by creation date descending
            .populate('schedule');    // Populate the associated schedule details

        if (!submission) {
            // It's okay if a user hasn't submitted yet, return 404
            return res.status(404).json({ message: 'No submission found for this user.' });
        }

        res.json(submission); // Send the latest submission

    } catch (error) {
        console.error("Error fetching user's latest submission:", error);
        res.status(500).json({ error: "Failed to fetch submission status." });
    }
};
// --- END NEW FUNCTION ---

module.exports.updateSubmissionResult = async (req, res) => {
    const { id } = req.params;
    const { result, preferredSchedule } = req.body; // result is lowercase from frontend

    console.log(`--- Starting updateSubmissionResult for ID: ${id} ---`); // Log start
    console.log(`Received result: ${result}, preferredSchedule:`, preferredSchedule);

    try {
        // Validate result
        if (!['accepted', 'rejected'].includes(result)) {
            console.error("Validation Error: Invalid result value provided:", result);
            return res.status(400).json({ error: 'Invalid result value provided.' });
        }
        // Validate preferredSchedule (basic)
        if (result === 'accepted' && (!preferredSchedule || !preferredSchedule.day || !preferredSchedule.time)) {
             console.error("Validation Error: Missing preferredSchedule for accepted result:", preferredSchedule);
            return res.status(400).json({ error: 'Preferred schedule (day and time) is required when accepting.' });
        }

        // Fetch the submission
        const submission = await ApplyBlocktimer.findById(id);
        if (!submission) {
            console.error(`Submission not found for ID: ${id}`);
            return res.status(404).json({ error: 'Submission not found' });
        }
        console.log("Fetched submission:", submission._id);

        const originalResult = submission.result;
        const originalScheduleDay = submission.preferredSchedule?.day;
        const originalScheduleTime = submission.preferredSchedule?.time;
        const newPreferredSchedule = preferredSchedule || submission.preferredSchedule; // Use new if provided, else keep original

        // Determine if schedule changed (only relevant if accepting)
        const scheduleChanged = result === 'accepted' &&
                                (originalScheduleDay !== newPreferredSchedule.day ||
                                 originalScheduleTime !== newPreferredSchedule.time);

        console.log(`Schedule changed: ${scheduleChanged}`);

        // Update the submission document
        submission.result = result;
        submission.preferredSchedule = newPreferredSchedule;
        // Add requiresAcknowledgement field if needed by your schema/logic
        // submission.requiresAcknowledgement = true; // Example if needed for both accept/reject

        const updatedSubmission = await submission.save();
        console.log("Submission document saved successfully:", updatedSubmission._id);

        // Prepare Email Content
        let emailSubject = "";
        let emailBody = "";
        let scheduleStatus = ""; // For Schedule document
        let requiresConfirmation = false; // For email/frontend logic
        const userEmail = submission.submittedBy; // Get email from submission
        const showTitle = submission.showDetails?.title || 'Your Show';

        console.log(`User email from submission: ${userEmail}`); // Log the email address

        // --- Logic based on result ---
        if (result === 'accepted') {
            console.log("Processing 'accepted' result..."); // Log entering block
            if (scheduleChanged) {
                console.log("Schedule changed, preparing confirmation email...");
                emailSubject = `Schedule Update for Your Show: ${showTitle}`;
                emailBody = `... SCHEDULE CHANGE: ACCEPTED - Your HTML for schedule change confirmation ...`; // Add your HTML
                scheduleStatus = "Pending Confirmation";
                requiresConfirmation = true;
            } else {
                console.log("Schedule NOT changed, preparing approval email...");
                emailSubject = `Application Approved: ${showTitle}`;
                emailBody = `... SCHEDULE: ACCEPTED - Your HTML for simple approval ...`; // Add your HTML
                scheduleStatus = "Accepted";
            }

            // --- Create or Update Schedule document ---
            console.log("Preparing schedule data for database...");
            const scheduleData = {
                day: newPreferredSchedule.day,
                time: newPreferredSchedule.time,
                schoolYear: submission.schoolYear,
                showDetails: submission.showDetails,
                executiveProducer: submission.executiveProducer,
                hosts: submission.hosts,
                technicalStaff: submission.technicalStaff,
                creativeStaff: submission.creativeStaff,
                submissionId: submission._id,
                confirmationStatus: scheduleStatus,
            };
            console.log("Schedule data:", scheduleData);

            try {
                console.log("Attempting to find or create schedule...");
                let schedule = await Schedule.findOneAndUpdate(
                    { submissionId: submission._id }, // Find by submissionId
                    scheduleData,                     // Data to insert or update with
                    { upsert: true, new: true, runValidators: true } // Options: create if not found, return new doc, run schema validation
                );
                console.log(`Successfully upserted schedule ${schedule._id} with status ${schedule.confirmationStatus}`);
            } catch (scheduleDbError) {
                console.error("!!! Database Error creating/updating schedule:", scheduleDbError);
                // Decide how to handle: maybe still send email but log error? Or return error?
                // For now, log it and continue to try sending email, but add error info
                 emailSubject = `Action Required: Issue Processing Schedule for ${showTitle}`;
                 emailBody = `<p>Your submission result was updated to ${result}, but there was an error saving the schedule details to the database. Please contact the administrator.</p><p>Error: ${scheduleDbError.message}</p>`;
                 // Don't return yet, let it try to send the error email
            }

        } else if (result === 'rejected') {
            console.log("Processing 'rejected' result..."); // Log entering block
            emailSubject = `Application Update: ${showTitle}`;
            emailBody = `... REJECTED - Your HTML for rejection ...`; // Add your HTML
            requiresConfirmation = true;

            // --- Delete any existing schedule associated with this submission ---
            try {
                console.log(`Attempting to delete schedule for submission ID: ${submission._id}`);
                const deletedSchedule = await Schedule.findOneAndDelete({ submissionId: submission._id });
                if (deletedSchedule) {
                    console.log(`Deleted schedule ${deletedSchedule._id} for rejected submission.`);
                } else {
                    console.log(`No existing schedule found to delete for submission ID: ${submission._id}`);
                }
            } catch (scheduleDeleteError) {
                 console.error("!!! Database Error deleting schedule:", scheduleDeleteError);
                 // Log and potentially modify email to notify admin/user
                 emailSubject = `Action Required: Issue Processing Rejection for ${showTitle}`;
                 emailBody = `<p>Your submission result was updated to ${result}, but there was an error removing the associated schedule from the database. Please contact the administrator.</p><p>Error: ${scheduleDeleteError.message}</p>`;
            }
        }

        // --- Send Email ---
        console.log(`Checking if email should be sent. Subject: "${emailSubject}", To: "${userEmail}"`); // Log before check
        if (emailSubject && userEmail) { // Check both subject and email validity
            console.log(`>>> Attempting to send email via mailer...`);
            try {
                await sendEmail(userEmail, emailSubject, emailBody);
                console.log(`✅ Email successfully queued for sending to ${userEmail}`);
            } catch (emailError) {
                console.error(`❌ FAILED to send email to ${userEmail}:`, emailError);
                // Consider how to inform admin/user about email failure. Maybe update submission status?
                // For now, just log it. The main submission update succeeded.
            }
        } else {
             console.log("--- Email not sent (Subject or UserEmail missing/invalid). ---"); // Log if skipped
        }

        // Respond to the frontend
        console.log("--- updateSubmissionResult finished successfully. Sending response. ---");
        res.status(200).json({
            message: 'Submission updated successfully.',
            submission: updatedSubmission, // Send back updated submission
            requiresConfirmation: requiresConfirmation // Inform frontend if user action needed
        });

    } catch (error) {
        console.error("!!! Unhandled Error in updateSubmissionResult:", error);
        res.status(500).json({ error: 'Server error updating submission.', details: error.message });
    }
};
