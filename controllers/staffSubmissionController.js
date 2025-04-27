const ApplyStaff = require('../models/ApplyStaff');
const User = require('../models/User');
const sendEmail = require('../config/mailer');

// --- NEW Submission Controller Functions ---

// Get distinct school years from submissions
exports.getSubmissionYears = async (req, res) => {
    try {
        const years = await ApplyStaff.distinct('schoolYear');
        // Sort years if needed, e.g., descending
        years.sort((a, b) => b.localeCompare(a));
        res.status(200).json(years);
    } catch (error) {
        console.error("Error fetching distinct submission years:", error);
        res.status(500).json({ message: "Failed to fetch submission years" });
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
    const { result } = req.body; // Expecting { "result": "Accepted" | "Rejected" | "Pending" }

    if (!result || !['Pending', 'Accepted', 'Rejected'].includes(result)) {
        return res.status(400).json({ message: 'Invalid result value provided.' });
    }

    try {
        const updatedSubmission = await ApplyStaff.findByIdAndUpdate(
            id,
            { result: result },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).populate('userId', 'email'); // Populate the user's email

        if (!updatedSubmission) {
            return res.status(404).json({ message: 'Submission not found.' });
        }

        console.log(`Submission ${id} status updated to ${result}`);

        // --- Send Email and Update Role ---
        if (result === 'Accepted' || result === 'Rejected') {
            if (updatedSubmission.userId && updatedSubmission.userId.email) {
                // --- Construct Email Content ---
                let subject = '';
                let htmlContent = '';
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

                    // If accepted, update user role to Staff
                    if (result === 'Accepted') {
                        const user = await User.findById(updatedSubmission.userId._id);
                        if (user && user.roles !== 'Admin') { // Don't downgrade Admins
                            // Reset progress flags upon acceptance/rejection decision being made
                            user.completedJoinGFMStep1 = true; // Mark step 1 as done (viewing result)
                            user.completedJoinGFMStep2 = true; // Mark step 2 as done (viewing result)
                            await user.save();
                            console.log(`User role updated to Staff for ${recipientEmail}`);
                        } else if (!user) {
                             console.error(`User not found with ID ${updatedSubmission.userId._id} to update role.`);
                        }
                    } else if (result === 'Rejected') {
                        // Also reset flags on rejection so they can potentially re-apply later
                         const user = await User.findById(updatedSubmission.userId._id);
                         if (user) {
                            user.completedJoinGFMStep1 = true; // Mark step 1 as done (viewing result)
                            user.completedJoinGFMStep2 = true; // Mark step 2 as done (viewing result)
                            await user.save();
                         }
                    }

                } catch (emailError) {
                    console.error(`!!! Failed to send result email for submission ${id}:`, emailError);
                    // Decide how to handle: maybe return a partial success? For now, log and continue.
                }
            } else {
                console.error(`!!! Cannot send email: User ID or email missing for submission ${id}`);
            }
        }
        // --- End Send Email and Update Role ---

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
exports.acknowledgeStaffResult = async (req, res) => {
    const userId = req.user.id; // From requireAuth

    try {
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            // Even if user not found, proceed to logout/clear cookie
            res.clearCookie('jwt'); // Clear JWT cookie
            return res.status(404).json({
                message: "User not found, logging out.",
                logout: true, // Signal frontend to handle logout/redirect
                redirectUrl: '/login'
            });
        }

        // Find the user's latest staff application to get the preferred department
        // Only proceed with role/dept update if the application was actually accepted
        const staffApplication = await ApplyStaff.findOne({ userId: userId, result: 'Accepted' }) // <<< Ensure it was accepted
            .sort({ createdAt: -1 });

        // --- Update Role and Department ---
        if (staffApplication) {
            // Update role only if current role is not Admin
            if (user.roles !== 'Admin') {
                user.roles = 'Staff'; // <<< Set role to Staff
                console.log(`User ${userId} role updated to Staff.`);
            } else {
                 console.log(`User ${userId} is Admin. Role not changed.`);
            }
            // Update department
            user.department = staffApplication.preferredDepartment; // <<< Set department
            console.log(`User ${userId} department updated to ${staffApplication.preferredDepartment}.`);
        } else {
            // This case means the user acknowledged a rejected/pending application,
            // or no application was found. Role/Department should not change.
            console.log(`User ${userId} acknowledged result, but no accepted application found. Role/Department not updated.`);
        }
        // --- End Update Role and Department ---

        // --- Reset progress flags ---
        user.completedJoinGFMStep1 = false;
        user.completedJoinGFMStep2 = false;
        // --- End Reset progress flags ---

        await user.save(); // Save changes (flags, potentially role and department)

        console.log(`User ${userId} acknowledged staff application result. Flags reset, user updated, logging out.`);

        // Log the user out by clearing the JWT cookie
        res.clearCookie('jwt'); // Ensure the cookie name matches what you set during login

        // Respond with success and redirect instruction
        res.status(200).json({
            message: "Result acknowledged and profile updated. Please log in again.", // Updated message
            logout: true, // Signal frontend to handle logout/redirect
            redirectUrl: '/login'
        });

    } catch (error) {
        console.error("Error acknowledging staff result:", error);
        // Attempt to clear cookie even on error before sending response
        res.clearCookie('jwt');
        res.status(500).json({
            message: "Server error acknowledging result. Logging out.",
            logout: true, // Signal frontend to handle logout/redirect
            redirectUrl: '/login'
         });
    }
};

// --- END NEW ---