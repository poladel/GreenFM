const User = require('../models/User');
const ApplyStaff = require('../models/ApplyStaff');
const User = require('../models/User');

module.exports.joinGFM1_post = async (req, res) => {
    const {
        lastName, firstName, middleInitial, suffix, studentNumber, dlsudEmail,
        college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
        preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
        greenFmContribution // Included in both destructuring and session storage
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

        // Debugging: Log session data
        console.log('Session Data in joinBlocktimer2_get:', applicationData);

        // Render the EJS view and pass the data
        res.render('2-user/7-joingreenfm-2', {
            pageTitle: 'Join GFM - Step 2',
            cssFile: 'css/joingreenfm2.css',
            applicationData,
            redirectUrl: req.query.redirect || '/' // Add redirectUrl
        });
    } catch (err) {
        console.error('Error in joinGFM2_get:', err);
        res.status(500).send('Server Error');
    }
};

module.exports.joinGFM2_post = async (req, res) => {
    // Check if registrationData exists in session
    if (!req.session.joinGFM1Data) {
        return res.status(400).json({
            error: 'Please return and complete Step 1.',
            redirect: '/JoinGFM-Step1'
        });
    }

    // Retrieve initial data from session
    const { lastName, firstName, middleInitial, suffix, studentNumber, dlsudEmail,
        college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
        preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
        greenFmContribution } = req.session.joinGFM1Data;

    // Check if user is authenticated via middleware
    if (!req.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
    }

    try {
        // Create the user with all data
        const applyStaff = await ApplyStaff.create({
            lastName, firstName, middleInitial, suffix, studentNumber, dlsudEmail,
            college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
            preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
            greenFmContribution
        });

        console.log('Staff Application Created:', applyStaff.lastName);

        // Clear session data
        req.session.joinGFM1Data = null;

        // Assuming req.user is populated by checkUser middleware
        const user = req.user; // Access the authenticated user
        user.completedJoinGFMStep2 = true;
        await user.save();

        // Respond with success and redirectUrl
        res.json({ 
            success: true, 
            redirectUrl: '/JoinGFM-Step3' // Add redirectUrl
        });
    } catch (error) {
        // Handle validation errors and other errors
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error:', error.errors);
            return res.status(400).json({ error: 'Validation Error', details: error.errors });
        }
        console.error('Error saving additional user information:', error);
        return res.status(500).json({ error: 'Failed to save user information' });
    }
};