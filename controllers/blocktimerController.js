const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const Schedule = require('../models/Schedule');
const User = require('../models/User'); // Assuming User model is needed if fetching user details
const sendEmail = require('../config/mailer'); // Verify this path is correct

module.exports.getSubmissions = async (req, res) => {
    console.log(`[getSubmissions] Received query:`, req.query); // Log incoming query
    try {
        const { schoolYear, result } = req.query;

        if (!schoolYear || typeof schoolYear !== "string") {
            console.error("[getSubmissions] Error: Missing or invalid schoolYear parameter");
            return res
                .status(400)
                .json({ error: "Missing or invalid schoolYear parameter" });
        }

        const query = { schoolYear };

        // <<< FIX: Convert incoming filter value to lowercase for DB query >>>
        if (result && result !== "All") {
            // Assuming DB stores 'pending', 'accepted', 'rejected' (lowercase)
            query.result = result.toLowerCase(); // <<< RE-ADD .toLowerCase() HERE
        }
        // <<< END FIX >>>

        console.log("[getSubmissions] Executing query:", query); // Log the exact query

        // <<< Add log before the database call >>>
        console.log("[getSubmissions] Attempting ApplyBlocktimer.find()...");
        const submissions = await ApplyBlocktimer.find(query).sort({
            createdAt: -1,
        });
        // <<< Add log after the database call >>>
        console.log(`[getSubmissions] ApplyBlocktimer.find() completed. Found ${submissions.length} submissions.`);

        // Optional: Check if submissions is serializable (basic check)
        try {
            JSON.stringify(submissions);
        } catch (stringifyError) {
            console.error("[getSubmissions] Error: Found submissions but failed to stringify:", stringifyError);
            return res.status(500).json({ error: "Failed to process submission data." });
        }

        console.log("[getSubmissions] Sending response...");
        res.json(submissions);
        console.log("[getSubmissions] Response sent successfully.");

    } catch (error) {
        // <<< Log the FULL error stack trace on the server >>>
        console.error("[getSubmissions] !!! Unhandled Error during fetch:", error); // Log the full error object/stack
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

// --- Modify updateSubmissionResult ---
module.exports.updateSubmissionResult = async (req, res) => {
    const { id } = req.params;
    const { result, preferredSchedule } = req.body; // result is lowercase from frontend
    const adminUserEmail = req.user?.email; // Admin performing the action

    console.log(`--- Starting updateSubmissionResult for ID: ${id} ---`);
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
        const applicantEmail = submission.submittedBy; // Email of the user who submitted
        const newPreferredSchedule = preferredSchedule || submission.preferredSchedule;

        const scheduleChanged = result === 'accepted' &&
                                (originalScheduleDay !== newPreferredSchedule.day ||
                                 originalScheduleTime !== newPreferredSchedule.time);

        console.log(`Schedule changed: ${scheduleChanged}`);

        // --- Store previous schedule info if it existed and result wasn't rejected ---
        let previousScheduleSlot = null;
        if (originalResult !== 'rejected' && originalScheduleDay && originalScheduleTime) {
            previousScheduleSlot = {
                day: originalScheduleDay,
                time: originalScheduleTime,
                schoolYear: submission.schoolYear
            };
        }

        // Update the submission document
        submission.result = result;
        submission.preferredSchedule = newPreferredSchedule;
        const updatedSubmission = await submission.save();
        console.log("Submission document saved successfully:", updatedSubmission._id);

        // Prepare Email Content & Socket Events
        let emailSubject = "";
        let emailBody = "";
        let scheduleStatus = "";
        let requiresConfirmation = false;
        const showTitle = submission.showDetails?.title || 'Your Show';
        let scheduleUpdateData = null; // Data for scheduleUpdate event
        let previousScheduleUpdateData = null; // Data to free up old slot

        console.log(`User email from submission: ${applicantEmail}`);

        // --- Logic based on result ---
        if (result === 'accepted') {
            console.log("Processing 'accepted' result...");
            scheduleStatus = scheduleChanged ? "Pending Confirmation" : "Accepted";
            requiresConfirmation = scheduleChanged;

            // --- Create or Update Schedule document ---
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
            try {
                let schedule = await Schedule.findOneAndUpdate(
                    { submissionId: submission._id },
                    scheduleData,
                    { upsert: true, new: true, runValidators: true }
                );
                console.log(`Successfully upserted schedule ${schedule._id} with status ${schedule.confirmationStatus}`);

                // <<< Prepare schedule update event data >>>
                scheduleUpdateData = {
                    action: 'update', // Or 'create' if needed
                    day: schedule.day,
                    time: schedule.time,
                    schoolYear: schedule.schoolYear,
                    showTitle: schedule.showDetails.title,
                    status: schedule.confirmationStatus // 'Accepted' or 'Pending Confirmation'
                };

                // If schedule changed, prepare data to free up the *previous* slot
                if (scheduleChanged && previousScheduleSlot) {
                     previousScheduleUpdateData = {
                         action: 'delete', // Free up the slot
                         day: previousScheduleSlot.day,
                         time: previousScheduleSlot.time,
                         schoolYear: previousScheduleSlot.schoolYear
                     };
                } else if (!scheduleChanged && previousScheduleSlot && originalResult === 'pending') {
                    // If schedule didn't change but was previously pending, still need to update the slot status from pending to accepted/pending confirmation
                     scheduleUpdateData.action = 'update_status'; // Custom action? Or just use 'update'
                }


            } catch (scheduleDbError) {
                console.error("!!! Database Error creating/updating schedule:", scheduleDbError);
                 emailSubject = `Action Required: Issue Processing Schedule for ${showTitle}`;
                 emailBody = `<p>Your submission result was updated to ${result}, but there was an error saving the schedule details to the database. Please contact the administrator.</p><p>Error: ${scheduleDbError.message}</p>`;
                 // Don't return yet, let it try to send the error email
            }

            // Prepare email content based on scheduleChanged
            if (scheduleChanged) {
                emailSubject = `Schedule Update for Your Show: ${showTitle}`;
                emailBody = `<p>Congratulations. Your show has been accepted as a blocktimer.</p>
                            <p>However, you have been rescheduled to a new time slot.</p>
                            <p>Please visit <a href="https://greenfm955.com/JoinBlocktimer-Step3" target="_blank">this link</a> to find out more details.</p>  `; // Add your HTML
            } else {
                emailSubject = `Application Approved: ${showTitle}`;
                emailBody = `<p>Congratulations. Your show has been accepted as a blocktimer.</p>
                            <p>Please visit <a href="https://greenfm955.com/JoinBlocktimer-Step3" target="_blank">this link</a> to find out more details.</p>`; // Add your HTML
            }

        } else if (result === 'rejected') {
            console.log("Processing 'rejected' result...");
            emailSubject = `Application Update: ${showTitle}`;
            emailBody = `<p>Thank you for your interest in joining Green FM 95.5 as a blocktimer.</p>
                        <p>After careful review, we regret to inform you that your show has not been selected at this time.</p>
                        <p>We encourage you to stay tuned for future opportunities. Thank you for your support and understanding!</p>
                        <p>Please visit <a href="https://greenfm955.com/JoinBlocktimer-Step3" target="_blank">this link</a> to find out more details.</p>`; // Add your HTML
            requiresConfirmation = true; // Requires acknowledgement

            // --- Delete any existing schedule ---
            try {
                const deletedSchedule = await Schedule.findOneAndDelete({ submissionId: submission._id });
                if (deletedSchedule) {
                    console.log(`Deleted schedule ${deletedSchedule._id} for rejected submission.`);
                    // <<< Prepare schedule update event data for deletion >>>
                    scheduleUpdateData = {
                        action: 'delete',
                        day: deletedSchedule.day,
                        time: deletedSchedule.time,
                        schoolYear: deletedSchedule.schoolYear
                    };
                } else if (previousScheduleSlot) {
                    // If it was pending before rejection, free up the pending slot
                     scheduleUpdateData = {
                         action: 'delete', // Free up the slot
                         day: previousScheduleSlot.day,
                         time: previousScheduleSlot.time,
                         schoolYear: previousScheduleSlot.schoolYear
                     };
                } else {
                    console.log(`No existing schedule found to delete for submission ID: ${submission._id}`);
                }
            } catch (scheduleDeleteError) {
                 console.error("!!! Database Error deleting schedule:", scheduleDeleteError);
                 emailSubject = `Action Required: Issue Processing Rejection for ${showTitle}`;
                 emailBody = `<p>Your submission result was updated to ${result}, but there was an error removing the associated schedule from the database. Please contact the administrator.</p><p>Error: ${scheduleDeleteError.message}</p>`;
            }
        }

        // --- Send Email ---
        if (emailSubject && applicantEmail) {
            console.log(`>>> Attempting to send email via mailer...`);
            try {
                await sendEmail(applicantEmail, emailSubject, emailBody);
                console.log(`✅ Email successfully queued for sending to ${applicantEmail}`);
            } catch (emailError) {
                console.error(`❌ FAILED to send email to ${applicantEmail}:`, emailError);
                // Log it. The main submission update succeeded.
            }
        } else {
             console.log("--- Email not sent (Subject or UserEmail missing/invalid). ---"); // Log if skipped
        }

        // <<< Emit Socket Events >>>
        // 1. Notify the specific applicant about their status update
        if (applicantEmail) {
            req.io.emit('submissionStatusUpdate', { // Emit generally, client filters
                submissionId: updatedSubmission._id,
                applicantEmail: applicantEmail, // Client checks if this matches their email
                result: updatedSubmission.result,
                preferredSchedule: updatedSubmission.preferredSchedule,
                showTitle: showTitle,
                requiresConfirmation: requiresConfirmation,
                // Include schedule details if accepted and confirmation needed
                schedule: (result === 'accepted' && scheduleChanged) ? scheduleUpdateData : null
            });
            console.log(`Emitted submissionStatusUpdate for ${applicantEmail}`);
        }

        // 2. Broadcast schedule changes (if any)
        if (previousScheduleUpdateData) {
            req.io.emit('scheduleUpdate', previousScheduleUpdateData);
            console.log('Emitted scheduleUpdate (freeing previous slot):', previousScheduleUpdateData);
        }
        if (scheduleUpdateData) {
            req.io.emit('scheduleUpdate', scheduleUpdateData);
            console.log('Emitted scheduleUpdate (new/updated slot):', scheduleUpdateData);
        }
         // 3. Notify admins about the update (optional, could rely on scheduleUpdate)
         req.io.emit('submissionAdminUpdate', { // Specific event for admin table refresh
             submissionId: updatedSubmission._id,
             result: updatedSubmission.result,
             preferredDay: updatedSubmission.preferredSchedule.day,
             preferredTime: updatedSubmission.preferredSchedule.time,
             schoolYear: updatedSubmission.schoolYear
         });
         console.log('Emitted submissionAdminUpdate');


        // Respond to the frontend
        console.log("--- updateSubmissionResult finished successfully. Sending response. ---");
        res.status(200).json({
            message: 'Submission updated successfully.',
            submission: updatedSubmission,
            requiresConfirmation: requiresConfirmation
        });

    } catch (error) {
        console.error("!!! Unhandled Error in updateSubmissionResult:", error);
        res.status(500).json({ error: 'Server error updating submission.', details: error.message });
    }
};

// --- Modify confirmSchedule ---
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
        // <<< FIX: Check against lowercase 'accepted' >>>
        if (submission.result !== 'accepted') {
            // Log the actual result for debugging
            console.error(`Confirm Error: Submission ${submissionId} result is '${submission.result}', not 'accepted'.`);
            return res
                .status(400)
                .json({ message: "Submission is not in an accepted state." });
        }

        // Find the associated schedule and update its status
        const schedule = await Schedule.findOne({
            submissionId: submission._id,
        });
        if (!schedule) {
             console.error(`Confirm Error: Associated schedule not found for submission ${submissionId}.`);
            return res
                .status(404)
                .json({ message: "Associated schedule not found." });
        }
        // <<< FIX: Check against 'Pending Confirmation' (assuming this is correct) >>>
        // Ensure the status being checked matches exactly what's saved in the Schedule model
        if (schedule.confirmationStatus !== "Pending Confirmation") {
             console.error(`Confirm Error: Schedule ${schedule._id} status is '${schedule.confirmationStatus}', not 'Pending Confirmation'.`);
            return res
                .status(400)
                .json({
                    message:
                        "Schedule does not require confirmation or already confirmed.",
                });
        }

        // <<< FIX: Update status to 'Accepted' (assuming this is the final confirmed status) >>>
        schedule.confirmationStatus = "Accepted";
        await schedule.save();
        console.log(`Schedule ${schedule._id} confirmed successfully.`);

        // Reset user progress flags
        const user = await User.findOne({ email: userEmail });
        if (user) {
            user.completedBlocktimerStep1 = false;
            user.completedBlocktimerStep2 = false;
            await user.save();
            console.log(`Reset progress flags for user ${userEmail}.`);
        }

        // <<< Emit schedule update event >>>
        req.io.emit('scheduleUpdate', {
            action: 'update_status', // Indicate status change
            day: schedule.day,
            time: schedule.time,
            schoolYear: schedule.schoolYear,
            showTitle: schedule.showDetails.title,
            status: schedule.confirmationStatus, // Now 'Accepted'
            scheduleId: schedule._id // <<< ADD scheduleId for admin grid update >>>
        });
        console.log(`Emitted scheduleUpdate for schedule ${schedule._id}`);

        // <<< Emit status update for the user >>>
         req.io.emit('submissionStatusUpdate', {
             submissionId: submission._id,
             applicantEmail: userEmail,
             result: submission.result, // Still 'accepted'
             actionTaken: 'confirmed', // Indicate confirmation happened
             showTitle: submission.showDetails?.title || 'Your Show', // <<< ADD showTitle
             preferredSchedule: submission.preferredSchedule, // Send latest schedule info
             schedule: { day: schedule.day, time: schedule.time } // Send confirmed schedule
         });
         console.log(`Emitted submissionStatusUpdate (confirmed) for user ${userEmail}`);


        res.status(200).json({ message: "Schedule confirmed successfully." });
    } catch (error) {
        console.error("Error confirming schedule:", error);
        res.status(500).json({ message: "Server error confirming schedule." });
    }
};

// --- Modify rejectScheduleChange ---
module.exports.rejectScheduleChange = async (req, res) => {
    const { id: submissionId } = req.params;
    const userEmail = req.user.email;

    try {
        const submission = await ApplyBlocktimer.findById(submissionId);

        // --- Add Logging ---
        console.log(`[rejectScheduleChange] Checking submission ID: ${submissionId}`);
        console.log(`[rejectScheduleChange] User email from req: ${userEmail}`);
        if (submission) {
            console.log(`[rejectScheduleChange] Submission found. Submitted by: ${submission.submittedBy}`);
        } else {
            console.log(`[rejectScheduleChange] Submission NOT found in DB.`);
        }
        
        if (!submission || submission.submittedBy !== userEmail) {
            return res
                .status(404)
                .json({ message: "Submission not found or access denied." });
        }
        // Check if the submission was in the 'accepted' state (meaning a schedule change was proposed)
        if (submission.result !== 'accepted') {
            console.error(`Reject Change Error: Submission ${submissionId} result is '${submission.result}', not 'accepted'. Cannot reject change.`);
            return res
                .status(400)
                .json({ message: "Submission is not in a state where a change can be rejected." });
        }

        // Delete the schedule that was pending confirmation
        const deletedSchedule = await Schedule.findOneAndDelete({
            submissionId: submission._id,
            confirmationStatus: "Pending Confirmation", // Ensure this matches the status set when schedule changes
        });

        if (!deletedSchedule) {
             console.error(`Reject Change Error: No schedule pending confirmation found for submission ${submissionId}.`);
            return res
                .status(404)
                .json({
                    message:
                        "No schedule pending confirmation found to reject.",
                });
        }
        console.log(`Deleted schedule ${deletedSchedule._id} due to user rejection.`);

        // <<< ADD: Update submission result to 'rejected' >>>
        submission.result = 'rejected';
        // Optionally clear preferredSchedule if rejection means starting over
        // submission.preferredSchedule = { day: null, time: null };
        await submission.save();
        console.log(`Updated submission ${submissionId} result to 'rejected'.`);
        // <<< END ADD >>>

        // Emit schedule update event (deletion)
        req.io.emit('scheduleUpdate', {
            action: 'delete',
            day: deletedSchedule.day,
            time: deletedSchedule.time,
            schoolYear: deletedSchedule.schoolYear
        });
        console.log(`Emitted scheduleUpdate (delete) for rejected change of schedule ${deletedSchedule._id}`);

        // Reset user progress flags
        const user = await User.findOne({ email: userEmail });
        if (user) {
            user.completedBlocktimerStep1 = false;
            user.completedBlocktimerStep2 = false;
            await user.save();
            console.log(`Reset progress flags for user ${userEmail} after rejecting change.`);
        }

         // Emit status update for the user
         req.io.emit('submissionStatusUpdate', {
             submissionId: submission._id,
             applicantEmail: userEmail,
             result: submission.result, // <<< Now sends 'rejected' >>>
             actionTaken: 'rejected_change',
             showTitle: submission.showDetails?.title || 'Your Show', // <<< ADD showTitle
             message: "Schedule change rejected. Your application status is now Rejected. Please contact admin or re-apply." // Updated message
         });
         console.log(`Emitted submissionStatusUpdate (rejected_change) for user ${userEmail}`);

         // <<< ADD: Emit admin update reflecting the rejection >>>
         req.io.emit('submissionAdminUpdate', {
             submissionId: submission._id,
             result: submission.result, // 'rejected'
             preferredDay: submission.preferredSchedule?.day, // Keep original preferred for reference? Or clear?
             preferredTime: submission.preferredSchedule?.time,
             schoolYear: submission.schoolYear
         });
         console.log('Emitted submissionAdminUpdate (rejected change)');
         // <<< END ADD >>>

        res.status(200).json({
            message: "Schedule change rejected. Your application status has been updated to Rejected.", // Updated response message
        });
    } catch (error) {
        console.error("Error rejecting schedule change:", error);
        res.status(500).json({
            message: "Server error rejecting schedule change.",
        });
    }
};

// --- Modify acknowledgeResult ---
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
         // Optionally check if result is 'Rejected' or 'Accepted' if this is for both
         // if (!['Rejected', 'Accepted'].includes(submission.result)) { ... }

         // Reset user progress flags
         const user = await User.findOne({ email: userEmail });
         if (user) {
             user.completedBlocktimerStep1 = false;
             user.completedBlocktimerStep2 = false;
             await user.save();
         }

         // <<< Emit status update for the user's UI >>>
          req.io.emit('submissionStatusUpdate', {
              submissionId: submission._id,
              applicantEmail: userEmail,
              actionTaken: 'acknowledged', // Indicate acknowledgement
              showTitle: submission.showDetails?.title || 'Your Show', // <<< ADD showTitle
              result: submission.result // Send current result ('rejected' or 'accepted')
          });


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
