const ApplyStaff = require('../models/ApplyStaff');
const User = require('../models/User');
const AssessmentSlot = require('../models/AssessmentSlot');
const AssessmentPeriod = require('../models/AssessmentPeriod');
const { endOfWeek, format } = require('date-fns'); // Ensure date-fns is installed

module.exports.joinGFM1_post = async (req, res) => {
    const {
        lastName, firstName, middleInitial, suffix, studentNumber, dlsudEmail,
        college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
        preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
        greenFmContribution
    } = req.body;

    try {
        // Store data in session
        req.session.joinGFM1Data = {
            lastName, firstName, middleInitial, suffix, studentNumber, dlsudEmail,
            college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
            preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
            greenFmContribution
        };

        // Log the session data for debugging
        console.log('Session Data Saved:', req.session.joinGFM1Data);

        // Mark Step 1 as completed
        if (req.user) {
            const user = await User.findById(req.user._id); // Fetch the user from the database
            if (user) {
                user.completedJoinGFMStep1 = true; // Update the field
                await user.save(); // Save the changes
                console.log('JoinGFM Step 1 marked as completed for user:', user._id);
            } else {
                console.error('User not found in the database.');
            }
        }

        // Respond with success
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving form data to session:', error);
        return res.status(500).json({ error: 'Failed to save form data' });
    }
};

module.exports.joinGFM2_get = async (req, res) => {
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

        // Redirect to Step 1 if Step 1 is not completed
        if (!user.completedJoinGFMStep1) {
            console.log('Step 1 not completed. Redirecting to Step 1.');
            return res.redirect('/JoinGFM-Step1');
        }

        // Redirect to Step 3 if Step 2 is already completed
        if (user.completedJoinGFMStep2) {
            console.log('Step 2 already completed. Redirecting to Step 3.');
            return res.redirect('/JoinGFM-Step3');
        }

        // Retrieve data from session
        const applicationData = req.session.joinGFM1Data;
        if (!applicationData || !applicationData.preferredDepartment) {
             console.error('Session data or preferredDepartment missing in joinGFM2_get.');
             return res.redirect('/JoinGFM-Step1');
        }

        // --- DEFINE currentYear HERE ---
        const currentYear = new Date().getFullYear(); // Define the variable
        // ---

        // --- Fetch Booked Slots ---
        let bookedSlots = [];
        try {
            // Use the defined currentYear
            const assessmentPeriod = await AssessmentPeriod.findOne({ year: currentYear });

            if (assessmentPeriod) {
                console.log(`Fetching booked slots for Dept: ${applicationData.preferredDepartment}, Year: ${currentYear}`);
                bookedSlots = await AssessmentSlot.find({
                    department: applicationData.preferredDepartment,
                    year: currentYear, // Use the defined currentYear
                    application: { $ne: null }
                }).select('date time -_id');
                console.log(`Found ${bookedSlots.length} booked slots.`);
            } else {
                console.warn(`No assessment period found for year ${currentYear}. Cannot fetch booked slots.`);
            }
        } catch (slotError) {
            console.error("Error fetching booked slots:", slotError);
        }
        // --- End Fetch Booked Slots ---

        // Debugging: Log session data
        console.log('Session Data in joinGFM2_get:', applicationData);

        // Render the EJS view and pass the data
        res.render('2-user/7-joingreenfm-2', {
            pageTitle: 'Join GFM - Step 2',
            cssFile: 'css/joingreenfm2.css',
            applicationData,
            bookedSlots: JSON.stringify(bookedSlots),
            currentYear: currentYear, // Pass the defined currentYear
            redirectUrl: req.query.redirect || '/'
        });
    } catch (err) {
        console.error('Error in joinGFM2_get:', err); // Log the actual error
        res.status(500).send('Server Error');
    }
};

// --- Controller to handle Step 2 submission (Replaces previous joinGFM2_post) ---
module.exports.joinGFM2_post = async (req, res) => {
    // --- Authentication check ---
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required.', redirect: '/login' });
    }

    // --- Session check ---
    const step1Data = req.session.joinGFM1Data;
    if (!step1Data) {
        // Reset progress flags if session is lost
        try {
            const user = await User.findById(req.user.id);
            if (user) {
                user.completedJoinGFMStep1 = false;
                user.completedJoinGFMStep2 = false;
                await user.save();
            }
        } catch (userError) {
            console.error("Error resetting user progress flags:", userError);
        }
        return res.status(400).json({ success: false, message: 'Session expired or Step 1 data missing.', redirect: '/JoinGFM-Step1' });
    }

    const { schoolYear, preferredSchedule } = req.body; // Get schedule from req.body

    // --- Validation ---
    if (!schoolYear || !preferredSchedule?.date || !preferredSchedule?.time) {
        return res.status(400).json({ success: false, message: 'Missing required fields (school year, date, time).' });
    }

    try {
        // --- Find existing application ---
        let application = await ApplyStaff.findOne({ userId: req.user.id, schoolYear: schoolYear }).sort({ createdAt: -1 });

        // <<< ADD DETAILED LOGGING >>>
        console.log(`DEBUG: Checking existing application for user ${req.user.id}, year ${schoolYear}.`);
        if (application) {
            console.log(`DEBUG: Found application ID: ${application._id}`);
            console.log(`DEBUG: Existing application preferredSchedule:`, JSON.stringify(application.preferredSchedule, null, 2));
            console.log(`DEBUG: Does application.preferredSchedule?.date exist? :`, !!application.preferredSchedule?.date);
        } else {
            console.log(`DEBUG: No existing application found.`);
        }
        // <<< END LOGGING >>>

        // --- Check if schedule ALREADY successfully submitted ---
        if (application && application.preferredSchedule?.date) {
             return res.status(400).json({ success: false, message: 'You have already submitted a schedule for this school year.' });
        }
        // ---

        // --- Prepare applicant details ---
        const appMiddle = step1Data.middleInitial ? ` ${step1Data.middleInitial}.` : '';
        const appSuffix = step1Data.suffix ? ` ${step1Data.suffix}` : '';
        const applicantNameString = `${step1Data.lastName}, ${step1Data.firstName}${appMiddle}${appSuffix}`;

        // --- Create or find application document ---
        let isNewApplication = false; // Flag to know if we created it in this request
        if (!application) {
            console.log(`Creating new ApplyStaff document for user ${req.user.id}, year ${schoolYear} INCLUDING schedule.`);
            isNewApplication = true;
            application = await ApplyStaff.create({ // <<< INCLUDE preferredSchedule HERE
                ...step1Data,
                schoolYear,
                preferredSchedule: preferredSchedule, // Pass schedule from req.body
                result: 'Pending',
                userId: req.user.id
            });
            console.log('New Staff Application Created (with schedule):', application._id);
        } else {
             console.log(`Found existing ApplyStaff document ${application._id} (schedule was previously empty)`);
             // If the application existed but schedule was empty, we'll update it later *after* booking.
             // If required:true is strict, this 'else' block might imply an inconsistent state.
             // For now, we assume if it exists here, the schedule *was* empty.
        }

        // --- Attempt to atomically book the slot ---
        console.log('--- Booking Attempt ---');
        console.log(`Attempting to book slot: ${preferredSchedule.date} ${preferredSchedule.time} for Dept: ${step1Data.preferredDepartment}, Year: ${schoolYear}`);
        const updatedSlot = await AssessmentSlot.findOneAndUpdate(
            {
                date: preferredSchedule.date,
                time: preferredSchedule.time,
                department: step1Data.preferredDepartment,
                year: schoolYear,
                application: null // *** Condition: Only update if not booked ***
            },
            {
                $set: {
                    application: application._id, // Link to the application
                    applicantName: applicantNameString,
                    applicantSection: step1Data.section
                }
            },
            { new: true } // Return the updated document if successful
        );

        // --- Handle Slot Booking Result ---
        if (!updatedSlot) {
            // Booking failed (conflict or slot not found)
            console.warn('!!! Slot booking failed (findOneAndUpdate returned null).');

            // <<< *** ADD ROLLBACK/CLEANUP for ApplyStaff *** >>>
            if (isNewApplication && application) {
                // If we created the application in *this* request, clear its schedule
                // because the booking failed. This allows the user to try again.
                console.log(`Booking failed. Clearing schedule for newly created ApplyStaff ${application._id}`);
                application.preferredSchedule = { date: null, time: null }; // Or just {}
                await application.save(); // Save the cleared schedule
            } else if (application) {
                 // If application existed before, maybe log that booking failed but don't clear schedule?
                 // Depends on desired behavior. Clearing might be safest.
                 console.log(`Booking failed. Clearing schedule for existing ApplyStaff ${application._id}`);
                 application.preferredSchedule = { date: null, time: null };
                 await application.save();
            }
            // <<< *** END ROLLBACK/CLEANUP *** >>>

            // Check reason for failure and return appropriate error
            const existingSlot = await AssessmentSlot.findOne({
                 date: preferredSchedule.date, time: preferredSchedule.time, department: step1Data.preferredDepartment, year: schoolYear
            });
            if (existingSlot && existingSlot.application) {
                console.error(`Slot was already booked by application ${existingSlot.application}.`);
                return res.status(409).json({ success: false, message: 'Sorry, this slot was just booked. Please select another.' });
            } else {
                console.error('Selected assessment slot not found or unavailable.');
                return res.status(404).json({ success: false, message: 'Selected assessment slot not found or unavailable.' });
            }
        }
        // --- Slot Booking Succeeded ---
        console.log('Assessment Slot successfully booked:', updatedSlot._id);

        // --- If application existed before, update its schedule NOW ---
        // (If it was a new application, schedule was already set during create)
        if (!isNewApplication && application) {
             console.log(`Updating existing ApplyStaff ${application._id} with confirmed schedule.`);
             application.preferredSchedule = preferredSchedule; // Set schedule from req.body
             await application.save();
             console.log(`ApplyStaff ${application._id} saved with schedule.`);
        }


        // --- Clear session data ---
        req.session.joinGFM1Data = null;

        // --- Update user progress ---
        const user = await User.findById(req.user.id);
        if (user) {
            user.completedJoinGFMStep2 = true;
            await user.save();
            console.log(`User ${user.id} completed JoinGFM Step 2.`);
        } else {
            console.error(`User ${req.user.id} not found when trying to update Step 2 completion.`);
        }

        // --- Emit Socket Events ---
        const io = req.io; // Make sure io is attached to req (e.g., via middleware)
        if (io) {
            // 1. Slot booked update
            io.emit('assessmentSlotUpdate', {
                action: 'booked',
                slot: {
                    _id: updatedSlot._id, // Use updatedSlot which is guaranteed to exist if we reach here
                    date: updatedSlot.date,
                    time: updatedSlot.time,
                    department: updatedSlot.department,
                    year: updatedSlot.year,
                    application: application._id,
                    applicantName: updatedSlot.applicantName,
                    applicantSection: updatedSlot.applicantSection
                }
            });
            console.log(`Emitted assessmentSlotUpdate (booked) for ${updatedSlot.date} ${updatedSlot.time}`);

            // 2. New submission notification for admin
            io.to('admin_room').emit('newStaffSubmission', {
                _id: application._id,
                lastName: application.lastName,
                firstName: application.firstName,
                preferredDepartment: application.preferredDepartment,
                result: application.result,
                schoolYear: application.schoolYear,
                // Add other fields needed for the admin table row
            });
            console.log(`Emitted newStaffSubmission to admin_room, ID: ${application._id}`);
        } else {
            console.warn("Socket.IO instance (req.io) not found. Cannot emit updates.");
        }

        // --- Success Response ---
        res.status(200).json({ success: true, message: 'Schedule selected successfully!', redirectUrl: '/JoinGFM-Step3' });

    } catch (error) {
        // Handle validation errors specifically if needed
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error:', error.errors);
            const errorDetails = {};
            for (const field in error.errors) {
                errorDetails[field] = error.errors[field].message;
            }
            return res.status(400).json({ success: false, message: 'Validation Error', details: errorDetails });
        }
        console.error('Error submitting GFM Step 2:', error);
        res.status(500).json({ success: false, message: 'Server error processing your request.' });
    }
};

// --- Get Applications for a Specific Week and Department ---
module.exports.getApplicationsForWeek = async (req, res) => {
    const { weekStart, department, year } = req.query; // Add year filter

    if (!weekStart || !department || !year) {
        return res.status(400).json({ error: 'Missing weekStart, department, or year query parameter.' });
    }

    try {
        // Calculate the start and end dates of the week (Monday to Friday)
        const startDate = new Date(weekStart + 'T00:00:00'); // Assuming weekStart is YYYY-MM-DD for Monday
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'Invalid weekStart date format.' });
        }

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 4); // Monday + 4 days = Friday

        const startDateString = startDate.toISOString().split('T')[0];
        const endDateString = endDate.toISOString().split('T')[0];

        console.log(`Fetching applications for Dept: ${department}, Year: ${year}, Week: ${startDateString} to ${endDateString}`);

        // Find assessment slots within the date range, matching the department and year, AND that are booked
        const bookedSlots = await AssessmentSlot.find({
            department: department,
            year: parseInt(year, 10), // Ensure year is a number
            date: {
                $gte: startDateString,
                $lte: endDateString,
            },
            application: { $ne: null } // Only include booked slots
        }).select('date time applicantName applicantSection application'); // Select needed fields from the slot

        console.log(`Found ${bookedSlots.length} booked slots for the week.`);
        res.json(bookedSlots); // Return the booked slot information

    } catch (error) {
        console.error('Error fetching booked slots for week:', error);
        res.status(500).json({ error: 'Failed to fetch booked slots' });
    }
};
// --- End ---
