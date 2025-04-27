const ApplyStaff = require('../models/ApplyStaff');
const User = require('../models/User');
const AssessmentSlot = require('../models/AssessmentSlot');
const AssessmentPeriod = require('../models/AssessmentPeriod');

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

module.exports.joinGFM2_post = async (req, res) => {
    // --- Check for user authentication first ---
    if (!req.user || !req.user.id) {
        console.error('User not authenticated or user ID missing in joinGFM2_post.');
        return res.status(401).json({ error: 'Authentication required. Please log in.', redirect: '/login' }); // Redirect to login
    }
    // ---

    if (!req.session.joinGFM1Data) {
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

        // Display error and redirect
        return res.status(400).json({
            error: 'Session data missing. Please return and complete Step 1.',
            redirect: '/JoinGFM-Step1'
        });
    }

    const { preferredDepartment } = req.session.joinGFM1Data; // Only need department for slot lookup here
    const { schoolYear, preferredSchedule } = req.body; // { date: 'YYYY-MM-DD', time: 'HH:MM-HH:MM' }

    // --- Validate preferredSchedule ---
    if (!preferredSchedule || !preferredSchedule.date || !preferredSchedule.time) {
        return res.status(400).json({ error: 'Preferred schedule (date and time) is required.' });
    }
    // ---

    try {
        // --- Find the chosen assessment slot ---
        console.log('--- Booking Attempt ---');
        console.log('Finding AssessmentSlot with:');
        console.log('  Date:', preferredSchedule.date);
        console.log('  Time:', preferredSchedule.time);
        console.log('  Department:', preferredDepartment);
        console.log('  Year:', schoolYear);

        const slotToBook = await AssessmentSlot.findOne({
            date: preferredSchedule.date,
            time: preferredSchedule.time,
            department: preferredDepartment,
            year: schoolYear
        });

        if (!slotToBook) {
            console.error('!!! AssessmentSlot.findOne FAILED to find a match.');
            return res.status(404).json({ error: 'Selected assessment slot not found or unavailable.' });
        } else {
            console.log('Found AssessmentSlot:', slotToBook._id);
            console.log('  Slot current application field:', slotToBook.application);
        }

        // --- Check if the slot is already booked ---
        if (slotToBook.application) {
            console.warn('!!! Slot already booked by:', slotToBook.application);
            return res.status(409).json({ error: 'Selected assessment slot has already been booked. Please choose another.' });
        }
        // ---

        // --- Retrieve Step 1 data from session ---
        const step1Data = req.session.joinGFM1Data;
        if (!step1Data) {
             console.error('!!! Session data from Step 1 is missing in joinGFM2_post.');
             return res.status(400).json({ error: 'Session expired or Step 1 data missing. Please start over.', redirect: '/JoinGFM-Step1' });
        }
        // ---

        // Create the application first, including data from Step 1 and the userId
        const applyStaff = await ApplyStaff.create({
            // --- SPREAD data from Step 1 session ---
            ...step1Data,
            // --- Add fields from Step 2 ---
            schoolYear,
            preferredSchedule,
            // --- ADD THE USER ID ---
            userId: req.user.id // Get the ID from the authenticated user
            // --- END ADD ---
        });

        console.log('Staff Application Created:', applyStaff._id, applyStaff.lastName, 'for User:', applyStaff.userId);

        // --- Now, link the application to the slot and update denormalized fields ---
        slotToBook.application = applyStaff._id; // Assign ObjectId
        const appMiddle = applyStaff.middleInitial ? ` ${applyStaff.middleInitial}.` : '';
        const appSuffix = applyStaff.suffix ? ` ${applyStaff.suffix}` : '';
        slotToBook.applicantName = `${applyStaff.lastName}, ${applyStaff.firstName}${appMiddle}${appSuffix}`;
        slotToBook.applicantSection = applyStaff.section;

        console.log('Attempting to save AssessmentSlot:', slotToBook._id);
        console.log('  With application field set to:', slotToBook.application);

        try {
            await slotToBook.save();
            console.log('Assessment Slot successfully saved:', slotToBook._id);
        } catch (saveError) {
            console.error('!!! FAILED to save AssessmentSlot:', slotToBook._id, saveError);
            // If saving the slot fails, we should ideally delete the ApplyStaff document
            // to avoid orphaned applications.
            try {
                await ApplyStaff.findByIdAndDelete(applyStaff._id);
                console.log(`Cleaned up orphaned ApplyStaff document: ${applyStaff._id}`);
            } catch (cleanupError) {
                console.error(`!!! FAILED to cleanup orphaned ApplyStaff document ${applyStaff._id}:`, cleanupError);
            }
            throw saveError; // Re-throw the original save error
        }
        // ---

        // Clear session data
        req.session.joinGFM1Data = null;

        // Update user progress
        const user = await User.findById(req.user.id); // Re-fetch user to be safe
        if (user) {
            user.completedJoinGFMStep2 = true;
            await user.save();
            console.log(`User ${user.id} completed JoinGFM Step 2.`);
        } else {
            console.error(`User ${req.user.id} not found when trying to update Step 2 completion.`);
        }


        res.json({
            success: true,
            redirectUrl: '/JoinGFM-Step3'
        });
    } catch (error) {
        // Handle validation errors and other errors
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error:', error.errors);
            const errorDetails = {};
            for (const field in error.errors) {
                errorDetails[field] = error.errors[field].message;
            }
            return res.status(400).json({ error: 'Validation Error', details: errorDetails });
        }
        console.error('Error in joinGFM2_post catch block:', error);
        res.status(500).json({ error: 'Failed to save application or book slot' });
    }
};

// --- NEW: Get Applications for a Specific Week and Department ---
module.exports.getApplicationsForWeek = async (req, res) => {
    const { weekStart, department } = req.query;

    if (!weekStart || !department) {
        return res.status(400).json({ error: 'Missing weekStart or department query parameter.' });
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

        console.log(`Fetching applications for Dept: ${department}, Week: ${startDateString} to ${endDateString}`);

        // Find applications within the date range and matching the department
        const applications = await ApplyStaff.find({
            preferredDepartment: department,
            'preferredSchedule.date': {
                $gte: startDateString,
                $lte: endDateString,
            }
        }).select('lastName firstName middleInitial suffix dlsudEmail studentNumber section preferredDepartment preferredSchedule'); // Select only needed fields

        console.log(`Found ${applications.length} applications.`);
        res.json(applications);

    } catch (error) {
        console.error('Error fetching applications for week:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};
// --- End NEW ---
