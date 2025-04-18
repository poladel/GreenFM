const ApplyBlocktimer = require('../models/ApplyBlocktimer');
const User = require('../models/User'); // Import the User model

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
        // Store data in the session
        req.session.joinBlocktimer1Data = {
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
        console.log('Session Data Saved:', req.session.joinBlocktimer1Data);

        // Mark Step 1 as completed
        if (req.user) {
            const user = await User.findById(req.user._id); // Fetch the user from the database
            if (user) {
                user.completedBlocktimerStep1 = true; // Update the field
                await user.save(); // Save the changes
                console.log('Step 1 marked as completed for user:', user._id);
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

        // Redirect to Step 1 if Step 1 is not completed
        if (!user.completedBlocktimerStep1) {
            console.log('Step 1 not completed. Redirecting to Step 1.');
            return res.redirect('/JoinBlocktimer-Step1');
        }

        // Redirect to Step 3 if Step 2 is already completed
        if (user.completedBlocktimerStep2) {
            console.log('Step 2 already completed. Redirecting to Step 3.');
            return res.redirect('/JoinBlocktimer-Step3');
        }

        // Retrieve data from session
        const applicationData = req.session.joinBlocktimer1Data;

        // Debugging: Log session data
        console.log('Session Data in joinBlocktimer2_get:', applicationData);

        // Render the EJS view and pass the data
        res.render('2-user/6-blocktimer-2', {
            pageTitle: 'Blocktimer Application - Step 2',
            cssFile: '/css/blocktimer2.css',
            applicationData,
            redirectUrl: req.query.redirect || '/' // Add redirectUrl
        });
    } catch (err) {
        console.error('Error in joinBlocktimer2_get:', err);
        res.status(500).send('Server Error');
    }
};

module.exports.joinBlocktimer2_post = async (req, res) => {
    // Check if registrationData exists in session
    if (!req.session.joinBlocktimer1Data) {
        if (req.user) {
            req.user.completedBlocktimerStep1 = false; // Set the field to false
            req.user.completedBlocktimerStep2 = false; // Set the field to false
            await req.user.save(); // Save changes to the database
        }
        
        // Display error and redirect
        return res.status(400).json({ 
            error: 'Please return and complete Step 1.',
            redirect: '/JoinBlocktimer-Step1'
        });
    }

    // Retrieve initial data from session
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
    } = req.session.joinBlocktimer1Data;

    // Retrieve selected day and time from the form
    const { 'preferred-days': preferredDay, 'preferred-time': preferredTime } = req.body;
    const schoolYear = new Date().getFullYear();

    // Check if user is authenticated via middleware
    if (!req.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
    }

    try {
        // Create the ApplyBlocktimer document
        const applyBlocktimer = await ApplyBlocktimer.create({
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
            proponentSignature,
            submittedBy: req.user.email, // Get the user's email from the session
            submittedOn: new Date(),
            preferredSchedule: {
                day: preferredDay,
                time: preferredTime
            },
            schoolYear// Set the current date and time
        });

        console.log('Blocktimer Application Created:', applyBlocktimer.showDetails.title);

        // Clear session data
        req.session.joinBlocktimer1Data = null;

        const user = req.user; // Access the authenticated user
        user.completedBlocktimerStep2 = true;
        await user.save();

        // Respond with success and redirectUrl
        res.json({ 
            success: true, 
            redirectUrl: '/JoinBlocktimer-Step3' // Add redirectUrl
        });
    } catch (error) {
        // Handle validation errors and other errors
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error:', error.errors);
            return res.status(400).json({ error: 'Validation Error', details: error.errors });
        }
        console.error('Error saving additional user information:', error);
        res.status(500).json({ error: 'Failed to save user information' });
    }
};


