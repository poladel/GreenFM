const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const User = require('../models/User');
const { io } = require('../server'); // Import io

module.exports.joinBlocktimer1_post = async (req, res) => {
    const {
        organizationType,
        organizationName,
        proponent: {
            lastName: proponentLastName,
            firstName: proponentFirstName,
            mi: proponentMI,
            suffix: proponentSuffix,
            cys: proponentCYS
        },
        coProponent: {
            lastName: coProponentLastName,
            firstName: coProponentFirstName,
            mi: coProponentMI,
            suffix: coProponentSuffix,
            cys: coProponentCYS,
            notApplicable: coProponentNotApplicable
        },
        showDetails: {
            title: showTitle,
            type: showType = [],
            description: showDescription,
            objectives: showObjectives
        },
        executiveProducer: {
            lastName: execProducerLastName,
            firstName: execProducerFirstName,
            mi: execProducerMI,
            suffix: execProducerSuffix,
            cys: execProducerCYS
        },
        facultyStaff: {
            lastName: facultyStaffLastName,
            firstName: facultyStaffFirstName,
            mi: facultyStaffMI,
            suffix: facultyStaffSuffix,
            department: facultyStaffDepartment,
            notApplicable: facultyStaffNotApplicable
        },
        hosts = [], // array of hosts
        technicalStaff = [], // array of technical staff
        creativeStaff: {
            lastName: creativeStaffLastName,
            firstName: creativeStaffFirstName,
            mi: creativeStaffMI,
            suffix: creativeStaffSuffix,
            cys: creativeStaffCYS
        },
        agreement,
        contactInfo: {
            dlsudEmail,
            contactEmail,
            contactFbLink,
            crossposting,
            fbLink
        },
        proponentSignature
    } = req.body;

    // Validate the structure before proceeding
    if (!Array.isArray(showType)) {
        return res.status(400).json({ error: 'showDetails.type must be an array' });
    }

    try {
        // Store data in the session - Use a consistent key like 'formData'
        req.session.formData = { // <<< CHANGE SESSION KEY
            organizationType,
            organizationName,
            proponent: {
                lastName: proponentLastName,
                firstName: proponentFirstName,
                mi: proponentMI,
                suffix: proponentSuffix,
                cys: proponentCYS
            },
            coProponent: {
                lastName: coProponentLastName,
                firstName: coProponentFirstName,
                mi: coProponentMI,
                suffix: coProponentSuffix,
                cys: coProponentCYS,
                notApplicable: coProponentNotApplicable
            },
            showDetails: {
                title: showTitle,
                type: showType,
                description: showDescription,
                objectives: showObjectives
            },
            executiveProducer: {
                lastName: execProducerLastName,
                firstName: execProducerFirstName,
                mi: execProducerMI,
                suffix: execProducerSuffix,
                cys: execProducerCYS
            },
            facultyStaff: {
                lastName: facultyStaffLastName,
                firstName: facultyStaffFirstName,
                mi: facultyStaffMI,
                suffix: facultyStaffSuffix,
                department: facultyStaffDepartment,
                notApplicable: facultyStaffNotApplicable
            },
            hosts, // array of hosts
            technicalStaff, // array of technical staff
            creativeStaff: {
                lastName: creativeStaffLastName,
                firstName: creativeStaffFirstName,
                mi: creativeStaffMI,
                suffix: creativeStaffSuffix,
                cys: creativeStaffCYS
            },
            agreement,
            contactInfo: {
                dlsudEmail,
                contactEmail,
                contactFbLink,
                crossposting,
                fbLink
            },
            proponentSignature
        };

        // Log the session data for debugging
        console.log('Session Data Saved:', req.session.formData); // <<< LOG CORRECT KEY

        // Mark Step 1 as completed
        if (req.user) {
            const user = await User.findById(req.user._id); // Fetch the user from the database
            if (user) {
                user.completedBlocktimerStep1 = true; // Update the field
                await user.save(); // Save the changes
                console.log('Step 1 marked as completed for user:', user._id);
                req.session.step1Completed = true; // Also set in session for immediate check
            } else {
                console.error('User not found in the database.');
            }
        }

        // Respond with success
        return res.status(200).json({ success: true }); // No socket event needed here yet
    } catch (error) {
        console.error('Error saving form data to session:', error);
        return res.status(500).json({ error: 'Failed to save form data' });
    }
};

module.exports.joinBlocktimer2_get = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: 'User is not authenticated' });
        }

        // Fetch the user from the database to check progress
        const user = await User.findById(req.user._id);

        if (!user) {
            console.error('User not found in the database.');
            return res.status(404).send('User not found');
        }

        // Redirect to Step 1 if Step 1 is not completed (check DB or session)
        if (!user.completedBlocktimerStep1 && !req.session.step1Completed) { // <<< CHECK SESSION TOO
            console.log('Step 1 not completed. Redirecting to Step 1.');
            return res.redirect('/JoinBlocktimer-Step1');
        }

        // Redirect to Step 3 if Step 2 is already completed
        if (user.completedBlocktimerStep2) {
            console.log('Step 2 already completed. Redirecting to Step 3.');
            return res.redirect('/JoinBlocktimer-Step3');
        }

        // Retrieve data from session using the correct key
        const applicationData = req.session.formData; // <<< USE CORRECT KEY

        // Debugging: Log session data
        console.log('Session Data in joinBlocktimer2_get:', applicationData);

        // Render the EJS view and pass the data
        res.render('2-user/6-blocktimer-2', {
            pageTitle: 'Blocktimer Application - Step 2',
            cssFile: '/css/blocktimer2.css',
            applicationData, // This might be undefined if session expired, handle in EJS
            redirectUrl: req.query.redirect || '/' // Add redirectUrl
        });
    } catch (err) {
        console.error('Error in joinBlocktimer2_get:', err);
        res.status(500).send('Server Error');
    }
};


// <<< MODIFY joinBlocktimer2_post >>>
module.exports.joinBlocktimer2_post = async (req, res) => {
    try {
        const formDataFromSession = req.session.formData; // Use the consistent session key

        // <<< FIX: Destructure the nested preferredSchedule object and schoolYear >>>
        const { preferredSchedule, schoolYear } = req.body;
        const preferredDay = preferredSchedule?.day; // Use optional chaining for safety
        const preferredTime = preferredSchedule?.time;
        // <<< END FIX >>>

        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'User is not authenticated' });
        }

        // Check if session data exists
        if (!formDataFromSession) {
            console.error("Error: Form data not found in session for Step 2.");
            // Reset progress flags if session is lost
            const user = await User.findById(req.user._id);
            if (user) {
                user.completedBlocktimerStep1 = false;
                user.completedBlocktimerStep2 = false;
                await user.save();
            }
            return res.status(400).json({ success: false, error: "Session expired or invalid. Please start over.", redirect: '/JoinBlocktimer-Step1' });
        }

        // <<< FIX: Validate the destructured variables >>>
        if (!preferredDay || !preferredTime || !schoolYear) {
             console.error("Error: Missing preferred day, time, or school year from Step 2 submission body.");
             console.error("Received Body:", req.body); // Log what was actually received
             // Send error back to the user on Step 2 page
             return res.status(400).json({ success: false, error: "Missing preferred day, time, or school year." });
        }
        // <<< END FIX >>>

        // Merge Step 2 data into session data
        const completeFormData = {
            ...formDataFromSession, // Spread data from Step 1
            preferredSchedule: { // Use the already validated values
                day: preferredDay,
                time: preferredTime
            },
            schoolYear: schoolYear, // Add schoolYear from Step 2
            submittedBy: req.user.email, // Add user identifier
            result: 'Pending' // Explicitly set initial result
        };

        // Create and save the new submission document
        const newSubmission = new ApplyBlocktimer(completeFormData);
        await newSubmission.save();

        console.log('Submission saved successfully:', newSubmission._id);

        // Clear session data after successful save
        delete req.session.formData;
        req.session.step1Completed = false; // Reset step completion flag in session

        // Mark Step 2 as completed in DB
        const user = await User.findById(req.user._id);
        if (user) {
            user.completedBlocktimerStep2 = true;
            await user.save();
            console.log('Step 2 marked as completed for user:', user._id);
        }

        // --- Emit Socket Events ---
        // Ensure io is available (passed via middleware or imported)
        if (req.io) {
            // 1. For the schedule grid update (pending status)
            req.io.emit('scheduleUpdate', {
                action: 'pending',
                schoolYear: newSubmission.schoolYear,
                showTitle: newSubmission.showDetails?.title,
                day: newSubmission.preferredSchedule?.day,
                time: newSubmission.preferredSchedule?.time
            });

            // 2. For the submissions list update
            req.io.emit('newSubmission', {
                submissionId: newSubmission._id,
                showTitle: newSubmission.showDetails?.title,
                submittedBy: newSubmission.submittedBy,
                schoolYear: newSubmission.schoolYear,
                result: newSubmission.result,
                preferredDay: newSubmission.preferredSchedule?.day,
                preferredTime: newSubmission.preferredSchedule?.time
            });
        } else {
            console.warn("Socket.io instance (req.io) not found in joinBlocktimerController.joinBlocktimer2_post. Cannot emit events.");
        }
        // --- End Emit Socket Events ---


        // Send success response with redirect URL
        res.status(200).json({ success: true, redirectUrl: '/JoinBlocktimer-Step3' });

    } catch (error) {
        console.error("Error processing Step 2 submission:", error);
        // Handle validation errors specifically if needed
        if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, error: "Validation failed. Please check your input.", details: error.errors });
        }
        res.status(500).json({ success: false, error: "An internal server error occurred." });
    }
};
// <<< END MODIFICATION >>>


