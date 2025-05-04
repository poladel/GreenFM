const ApplyStaff = require('../models/ApplyStaff');
const User = require('../models/User');
const sendEmail = require('../config/mailer'); // <<< ADD THIS IMPORT (Adjust path if needed)

// --- NEW Submission Controller Functions ---

// Get distinct school years from submissions
exports.getSubmissionYears = async (req, res) => {
    try {
        const years = await ApplyStaff.distinct('schoolYear');
        // Filter out null/undefined/empty values and sort descending
        const validYears = years
            .filter(year => year !== null && typeof year !== 'undefined' && year !== '')
            .map(year => year.toString()) // Ensure they are strings
            .sort((a, b) => b.localeCompare(a)); // Sort descending (e.g., "2025", "2024")

        console.log("[Controller getSubmissionYears] Found distinct years:", validYears);
        res.status(200).json(validYears); // Send the array as JSON
    } catch (error) {
        console.error("Error fetching distinct submission years:", error);
        // FIX: Ensure error response is JSON
        res.status(500).json({ success: false, message: "Failed to fetch submission years", error: error.message });
    }
};

// Get submissions based on filters
exports.getSubmissions = async (req, res) => {
    try {
        const { year, status, department, id } = req.query; // Add id for fetching single

        const query = {};

        if (id) {
            // If ID is provided, fetch only that one (for detail view)
            query._id = id;
        } else {
            // Apply filters if no ID
            if (year) {
                query.schoolYear = year;
            } else {
                // Default to current year if no year specified? Or handle error?
                // For now, let's require year or fetch all if none provided
                // query.schoolYear = new Date().getFullYear().toString(); // Example default
            }

            if (status && status !== 'All') {
                query.result = status;
            }

            if (department && department !== 'All') {
                query.preferredDepartment = department;
            }
        }


        console.log("Submission Query:", query); // Log the query

        // Select fields needed for the table or full details
        const selection = id ? '' : 'lastName firstName middleInitial suffix studentNumber preferredDepartment result'; // Empty string selects all if ID is present

        const submissions = await ApplyStaff.find(query)
            .select(selection)
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(submissions);

    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Failed to fetch submissions" });
    }
};

// Update submission result, send email, and update role
exports.updateSubmissionResult = async (req, res) => {
    const { id } = req.params;
    const { result } = req.body;

    if (!result || !['Pending', 'Accepted', 'Rejected'].includes(result)) {
        return res.status(400).json({ message: 'Invalid result value provided.' });
    }

    try {
        const updatedSubmission = await ApplyStaff.findByIdAndUpdate(
            id, { result: result }, { new: true, runValidators: true }
        ).populate('userId', 'email'); // <<< REMOVE roles from populate here if only needed for update logic

        if (!updatedSubmission) return res.status(404).json({ message: 'Submission not found.' });

        console.log(`Submission ${id} status updated to ${result}`);

        // --- Send Email ---
        if (result === 'Accepted' || result === 'Rejected') {
            // --- Construct Email Content ---
            let subject = '';
            let htmlContent = '';
            // Ensure userId and email exist before trying to send
            if (!updatedSubmission.userId || !updatedSubmission.userId.email) {
                 console.warn(`Cannot send email for submission ${id}: User ID or email missing.`);
            } else {
                const recipientEmail = updatedSubmission.userId.email;

                if (result === 'Accepted') {
                    subject = 'Congratulations! Your GreenFM Staff Application Update';
                    htmlContent = `
                        <p>Dear Applicant,</p>
                        <p>Congratulations! Your application to join GreenFM has been <strong>approved</strong>.</p>
                        <p>Welcome to the team! Further details regarding your role and onboarding will follow soon.</p>
                        <p>Please log in to your GreenFM account to acknowledge this update.</p>
                        <br>
                        <p>Sincerely,</p>
                        <p>The GreenFM Team</p>
                    `;
                } else { // result === 'Rejected'
                    subject = 'GreenFM Staff Application Update';
                    htmlContent = `
                        <p>Dear Applicant,</p>
                        <p>Thank you for your interest in joining GreenFM.</p>
                        <p>We regret to inform you that your application has been <strong>rejected</strong> at this time. We received many qualified applications, and the decision was difficult.</p>
                        <p>We encourage you to keep an eye out for future application periods.</p>
                        <p>Please log in to your GreenFM account to acknowledge this update.</p>
                        <br>
                        <p>Sincerely,</p>
                        <p>The GreenFM Team</p>
                    `;
                }
                // --- End Construct Email Content ---

                try {
                    // --- Call Generic sendEmail ---
                    await sendEmail(recipientEmail, subject, htmlContent);
                    console.log(`Result email sent to ${recipientEmail} for submission ${id}`);
                    // --- End Call Generic sendEmail ---

                } catch (emailError) {
                    // Log error but continue, as the main submission update succeeded
                    console.error(`!!! Error during email sending for submission ${id}:`, emailError);
                }
            }
        }
        // --- End Send Email ---

        // <<< Emit Socket Events >>>
        // 1. Targeted update to the specific user (using user ID room)
        if (updatedSubmission.userId?._id) {
            const targetUserId = updatedSubmission.userId._id.toString();
            req.io.to(targetUserId).emit('staffSubmissionStatusUpdate', {
                submissionId: updatedSubmission._id,
                result: updatedSubmission.result,
                preferredDepartment: updatedSubmission.preferredDepartment,
                // Include any other data needed by joingreenfm3.js
            });
            console.log(`Emitted staffSubmissionStatusUpdate to user room ${targetUserId}`);
        } else {
             console.warn(`Could not emit targeted update for submission ${id}: User ID missing.`);
        }

        // 2. General update for admin table (to admin_room)
        req.io.to('admin_room').emit('staffAdminSubmissionUpdate', {
            _id: updatedSubmission._id,
            result: updatedSubmission.result,
            // Include other fields needed to update the admin table row
            lastName: updatedSubmission.lastName,
            firstName: updatedSubmission.firstName,
            preferredDepartment: updatedSubmission.preferredDepartment,
            schoolYear: updatedSubmission.schoolYear
        });
        console.log(`Emitted staffAdminSubmissionUpdate to admin_room`);
        // <<< End Emit Socket Events >>>

        res.status(200).json({ message: 'Submission status updated successfully.', submission: updatedSubmission });

    } catch (error) {
        console.error("Error updating submission result:", error);
        res.status(500).json({ message: 'Failed to update submission status.' });
    }
};

// --- NEW: Get User's Latest Staff Application ---
exports.getMyLatestStaffApplication = async (req, res) => {
    const userId = req.user.id; // From requireAuth

    try {
        const submission = await ApplyStaff.findOne({ userId: userId })
            .sort({ createdAt: -1 }); // Get the most recent one

        if (!submission) {
            return res.status(404).json({ message: 'No staff application found for this user.' });
        }
        res.status(200).json(submission);
    } catch (error) {
        console.error("Error fetching user's latest staff application:", error);
        res.status(500).json({ message: "Failed to fetch application status." });
    }
};

// --- NEW: Acknowledge Staff Result ---
exports.acknowledgeResult = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // 1. Find the specific submission by ID and ensure it belongs to the logged-in user
        const submission = await ApplyStaff.findOne({ _id: id, userId: userId });

        if (!submission) {
            return res.status(404).json({ message: 'Application not found or does not belong to user.' });
        }

        // Check if the submission was actually accepted
        if (submission.result !== 'Accepted') {
            // Allow acknowledging rejection, but don't update role/department
            submission.acknowledged = true;
            await submission.save();
            console.log(`User ${userId} acknowledged rejected submission ${id}`);
            // Send response indicating acknowledgment but no role change
             return res.status(200).json({
                message: 'Rejection acknowledged.',
                logout: false // Or true if you want logout on rejection ack
            });
        }

        // --- Logic for ACCEPTED acknowledgment ---
        submission.acknowledged = true;
        await submission.save();
        console.log(`User ${userId} acknowledged accepted submission ${id}`);

        // Find the associated User and update their role, department, and flags
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            // This shouldn't happen if the user is logged in, but handle defensively
            console.error(`User ${userId} not found during acknowledgment of submission ${id}`);
            return res.status(404).json({ message: 'User record not found.' });
        }

        console.log("User object before role/flag update:", JSON.stringify(userToUpdate, null, 2));
        const oldRole = userToUpdate.roles; // Capture old role (string)

        // <<< UPDATE FLAGS AND ROLE HERE >>>
        userToUpdate.completedJoinGFMStep1 = false;
        userToUpdate.completedJoinGFMStep2 = false;
        userToUpdate.roles = 'Staff'; // Assign the string 'Staff' (assuming single role schema)
        userToUpdate.department = submission.preferredDepartment;
        // <<< END UPDATE >>>

        const updatedUser = await userToUpdate.save();
        console.log(`User ${userId} flags updated, role updated to Staff, department to ${updatedUser.department}. Old role: ${oldRole}`);

        // <<< EMIT SOCKET EVENT TO ADMINS >>>
        if (req.io) { // Check if io is attached to req
             const userDataForEmit = {
                _id: updatedUser._id.toString(), // Ensure ID is string
                roles: updatedUser.roles,
                department: updatedUser.department,
                // Include other fields needed by the admin table if necessary
                lastName: updatedUser.lastName,
                firstName: updatedUser.firstName,
                username: updatedUser.username,
                email: updatedUser.email
            };
            req.io.to('admin_room').emit('userAccountUpdated', userDataForEmit);
            console.log(`Emitted userAccountUpdated to admin_room for user ${updatedUser._id}`);
        } else {
            console.warn("Socket.IO instance (req.io) not found. Cannot emit userAccountUpdated event.");
        }
        // <<< END EMIT >>>

        // Respond to the user - Force logout and redirect
        res.clearCookie('jwt'); // Clear access token cookie
        res.clearCookie('refreshToken'); // Clear refresh token cookie (if used)

        return res.status(200).json({
            message: 'Acceptance acknowledged! Your role has been updated. Please log in again.',
            logout: true, // Flag for frontend to know logout happened
            redirectUrl: '/LogIn' // URL for frontend to redirect to
        });

    } catch (error) {
        console.error(`Error acknowledging result for submission ${id}:`, error);
        res.status(500).json({ message: 'Failed to acknowledge result.' });
    }
};

// --- END NEW ---