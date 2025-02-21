const User = require('../models/User');
const ApplyStaff = require('../models/ApplyStaff');

module.exports.joinGFM1_post = async (req, res) => {
    const {
        lastName, firstName, middleInitial, studentNumber, dlsudEmail,
        college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
        preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
    } = req.body;

    // Store data in session
    req.session.joinGFM1Data = {
        lastName, firstName, middleInitial, studentNumber, dlsudEmail,
        college, program, collegeYear, section, facebookUrl, affiliatedOrgsList,
        preferredDepartment, staffApplicationReasons, departmentApplicationReasons,
        greenFmContribution
    };

    // Check if user is authenticated via middleware
    if (!req.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
    }

    try {
        // Assuming req.user is populated by checkUser middleware
        const user = req.user; // Access the authenticated user
        user.completedJoinGFMStep1 = true;
        await user.save();

        // Respond with a success message
        return res.status(200).json({ success: true });
    } catch (error) {
        // Handle any errors that may occur
        return res.status(400).json({ error: error.message });
    }
};

module.exports.joinGFM2_post = async (req, res) => {
    // Check if registrationData exists in session
    if (!req.session.joinGFM1Data) {
        return res.status(400).json({ 
            error: 'Please return and complete Step 1.',

        if (req,user) {
            req.user.completedJoinGFMStep1 = false; // Set the field to false

        if (req.user) {
            req.user.completedJoinGFMStep1 = false; // Set the field to false
            req.user.completedJoinGFMStep2 = false; // Set the field to false
     remotes/origin/polabranch
            await req.user.save(); // Save changes to the database
        }
        
        // Display error and redirect
        return res.status(400).json({ 
            error: 'Please return and complete Step 1.',
            redirect: '/JoinGFM-Step1'
        });
    }

    // Retrieve initial data from session
    const { lastName, firstName, middleInitial, studentNumber, dlsudEmail,
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
            lastName, firstName, middleInitial, studentNumber, dlsudEmail,
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

        // Respond with success
        res.json({ success: true }); // Send success response
    } catch (error) {
        console.error('Error saving additional user information:', error);
        res.status(500).json({ error: 'Failed to save user information' });
    }
};
    }
