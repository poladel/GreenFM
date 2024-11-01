const ApplyBlocktimer = require('../models/ApplyBlocktimer');

module.exports.joinBlocktimer1_post = async (req, res) => {
    const {
        organizationType,
        organizationName,
        proponent: {
            lastName: proponentLastName,
            firstName: proponentFirstName,
            mi: proponentMI,
            cys: proponentCYS
        },
        coProponent: {
            lastName: coProponentLastName,
            firstName: coProponentFirstName,
            mi: coProponentMI,
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
            cys: execProducerCYS
        },
        facultyStaff: {
            lastName: facultyStaffLastName,
            firstName: facultyStaffFirstName,
            mi: facultyStaffMI,
            department: facultyStaffDepartment,
            notApplicable: facultyStaffNotApplicable
        },
        hosts = [], // array of hosts
        technicalStaff = [], // array of technical staff
        creativeStaff: {
            lastName: creativeStaffLastName,
            firstName: creativeStaffFirstName,
            mi: creativeStaffMI,
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

    // Log hosts and technicalStaff for debugging
    console.log('Hosts:', hosts);
    console.log('Technical Staff:', technicalStaff);

    // Store data in session
    req.session.joinBlocktimer1Data = {
        organizationType,
        organizationName,
        proponent: {
            lastName: proponentLastName,
            firstName: proponentFirstName,
            mi: proponentMI,
            cys: proponentCYS
        },
        coProponent: {
            lastName: coProponentLastName,
            firstName: coProponentFirstName,
            mi: coProponentMI,
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
            cys: execProducerCYS
        },
        facultyStaff: {
            lastName: facultyStaffLastName,
            firstName: facultyStaffFirstName,
            mi: facultyStaffMI,
            department: facultyStaffDepartment,
            notApplicable: facultyStaffNotApplicable
        },
        hosts, // array of hosts
        technicalStaff, // array of technical staff
        creativeStaff: {
            lastName: creativeStaffLastName,
            firstName: creativeStaffFirstName,
            mi: creativeStaffMI,
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

     // Log the data being saved to the session
     console.log('Data saved to session:', req.session.joinBlocktimer1Data);

    // Check if user is authenticated via middleware
    if (!req.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
    }

    try {
        const user = req.user; // Access the authenticated user
        user.completedBlocktimerStep1 = true;
        await user.save();

        // Respond with a success message
        return res.status(200).json({ success: true });
    } catch (error) {
        // Handle any errors that may occur
        return res.status(400).json({ error: error.message });
    }
};

module.exports.joinBlocktimer2_post = async (req, res) => {
    console.log('Entering joinBlocktimer2_post');
    console.log('Session Data:', req.session.joinBlocktimer1Data);
    // Check if registrationData exists in session
    if (!req.session.joinBlocktimer1Data) {
        if (req.user) {
            req.user.completedBlocktimerStep1 = false; // Set the field to false
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
            cys: proponentCYS
        },
        coProponent: {
            lastName: coProponentLastName,
            firstName: coProponentFirstName,
            mi: coProponentMI,
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
            cys: execProducerCYS
        },
        facultyStaff: {
            lastName: facultyStaffLastName,
            firstName: facultyStaffFirstName,
            mi: facultyStaffMI,
            department: facultyStaffDepartment,
            notApplicable: facultyStaffNotApplicable
        },
        hosts, // array of hosts
        technicalStaff, // array of technical staff
        creativeStaff: {
            lastName: creativeStaffLastName,
            firstName: creativeStaffFirstName,
            mi: creativeStaffMI,
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

    // Check if user is authenticated via middleware
    if (!req.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
    }

    try {
        // Create the user with all data
        const applyBlocktimer = await ApplyBlocktimer.create({
        organizationType,
        organizationName,
        proponent: {
            lastName: proponentLastName,
            firstName: proponentFirstName,
            mi: proponentMI,
            cys: proponentCYS
        },
        coProponent: {
            lastName: coProponentLastName,
            firstName: coProponentFirstName,
            mi: coProponentMI,
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
            cys: execProducerCYS
        },
        facultyStaff: {
            lastName: facultyStaffLastName,
            firstName: facultyStaffFirstName,
            mi: facultyStaffMI,
            department: facultyStaffDepartment,
            notApplicable: facultyStaffNotApplicable
        },
        hosts, // array of hosts
        technicalStaff, // array of technical staff
        creativeStaff: {
            lastName: creativeStaffLastName,
            firstName: creativeStaffFirstName,
            mi: creativeStaffMI,
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
        });

        console.log('Blocktimer Application Created:', applyBlocktimer.showTitle);

        // Clear session data
        req.session.joinBlocktimer1Data = null;

        const user = req.user; // Access the authenticated user
        user.completedBlocktimerStep2 = true;
        await user.save();

        // Respond with success
        res.json({ success: true }); // Send success response
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
