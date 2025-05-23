const express = require('express');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');
const { checkRouteAvailability } = require('../middleware/routeAvailabilityMiddleware');
const joinBlocktimerController = require('../controllers/joinBlocktimerController');
const joinGFMController = require('../controllers/joinGFMController');
const User = require('../models/User');
const Playlist = require("../models/Playlist");
const Post = require('../models/Post'); // Assuming Post model for archives
const router = express.Router();

// Define the routes for each 'user' section with dynamic titles
const userRoutes = [
    // Public routes (auth: false or omitted)
    { path: '/Live', view: '2-user/2-live', pageTitle: 'Live',  headerTitle: 'LIVE', cssFile: 'css/live.css'},
    { path: '/Forum', view: '2-user/3-forum', pageTitle: 'Forum', headerTitle: 'FORUM', cssFile: 'css/forum.css'},
    { path: '/Playlist', view: '2-user/5-playlist', pageTitle: 'Playlist', headerTitle: 'PLAYLIST', cssFile: 'css/playlist.css' },
    { path: '/About', view: '2-user/8-about', pageTitle: 'About Us', headerTitle: 'ABOUT US' , cssFile: 'css/about.css'},
    { path: '/Contact', view: '2-user/9-contact', pageTitle: 'Contact Us', headerTitle: 'CONTACT US', cssFile: 'css/contact.css' },

    // Routes requiring authentication (auth: true)
    { path: '/JoinBlocktimer-Step1', view: '2-user/6-blocktimer-1', pageTitle: 'Join Blocktimer - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/blocktimer.css', roles: ['User'], restricted: true},
    { path: '/JoinBlocktimer-Step2', controller: joinBlocktimerController.joinBlocktimer2_get, headerTitle: 'STEP 2', auth: true, roles: ['User'], restricted: true},
    { path: '/JoinBlocktimer-Step3', view: '2-user/6-blocktimer-3', pageTitle: 'Join Blocktimer - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/blocktimer.css', roles: ['User'], restricted: true},
    { path: '/JoinGFM-Step1', view: '2-user/7-joingreenfm-1', pageTitle: 'Join GFM - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/joingreenfm.css', roles: ['User'], middleware: checkRouteAvailability('JoinGFM'), restricted: true },
    { path: '/JoinGFM-Step2', controller: joinGFMController.joinGFM2_get, headerTitle: 'STEP 2', auth: true, roles: ['User'], middleware: checkRouteAvailability('JoinGFM'), restricted: true},
    { path: '/JoinGFM-Step3', view: '2-user/7-joingreenfm-3', pageTitle: 'Join GFM - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/joingreenfm.css', roles: ['User'], middleware: checkRouteAvailability('JoinGFM'), restricted: true },
    { path: '/ManageAccount', view: '3-logreg/5-manage-account', pageTitle: 'Manage Account', headerTitle: 'MANAGE ACCOUNT', auth: true, cssFile: 'css/admin-account.css'  }
];

// Define the routes and render views with dynamic titles
userRoutes.forEach(userRoute => {
    // <<< APPLY MIDDLEWARE CONDITIONALLY >>>
    const routeMiddleware = [
        // 1. Apply requireAuth only if userRoute.auth is true
        (req, res, next) => {
            if (userRoute.auth) {
                requireAuth(req, res, next); // Call requireAuth if needed
            } else {
                next(); // Skip requireAuth for public routes
            }
        },
        // 2. Apply checkRoles only if userRoute.roles is defined
        userRoute.roles ? checkRoles(userRoute.roles) : (req, res, next) => next(),
        // 3. Apply custom middleware if defined
        async (req, res, next) => {
            if (userRoute.middleware) {
                console.log(`Executing middleware for route: ${userRoute.path}`);
                await userRoute.middleware(req, res, next);
            } else {
                next();
            }
        }
    ];

    // <<< USE THE CONDITIONALLY BUILT MIDDLEWARE ARRAY >>>
    router.get(userRoute.path, routeMiddleware, async (req, res, next) => {
        try {
            console.log(`Handling route: ${userRoute.path}`);
            const user = res.locals.user; // Get user from middleware

            // <<< Add redirection logic specifically for /JoinGFM-Step3 >>>
            if (userRoute.path === '/JoinBlocktimer-Step3') {
                if (!user) {
                    // Should be handled by requireAuth, but as a safeguard
                    return res.redirect('/LogIn');
                }
                if (!user.completedBlocktimerStep1) {
                    console.log('Step 1 not completed. Redirecting to Step 1.');
                    return res.redirect('/JoinBlocktimer-Step1');
                }
                if (!user.completedBlocktimerStep2) {
                    console.log('Step 1 completed but Step 2 not. Redirecting to Step 2.');
                    return res.redirect('/JoinBlocktimer-Step2');
                }
                // If both steps 1 and 2 are complete, proceed to render Step 3 below
            }
            // <<< End of /JoinGFM-Step3 specific logic >>>

            // <<< Add redirection logic specifically for /JoinGFM-Step3 >>>
            if (userRoute.path === '/JoinGFM-Step3') {
                if (!user) {
                    // Should be handled by requireAuth, but as a safeguard
                    return res.redirect('/LogIn');
                }
                if (!user.completedJoinGFMStep1) {
                    console.log('Step 1 not completed. Redirecting to Step 1.');
                    return res.redirect('/JoinGFM-Step1');
                }
                if (!user.completedJoinGFMStep2) {
                    console.log('Step 1 completed but Step 2 not. Redirecting to Step 2.');
                    return res.redirect('/JoinGFM-Step2');
                }
                // If both steps 1 and 2 are complete, proceed to render Step 3 below
            }
            // <<< End of /JoinGFM-Step3 specific logic >>>


            let playlist = [];
            if (userRoute.path === '/Playlist') {
                playlist = await Playlist.find().sort({ createdAt: -1 });
            }

            // Delegate to controller if specified
            if (userRoute.controller) {
                // Ensure controllers also receive user if needed, or pass it in res.locals
                // If the controller renders, it needs to pass the user object itself.
                // If it just fetches data and calls next(), the final render below handles it.
                // For safety, let's assume controllers might render or need user data.
                // res.locals.user = user; // Ensure it's available if controller calls next() then another middleware renders
                return userRoute.controller(req, res, next);
            }

            // Render the view if no controller is specified
            return res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                user: user, // <<< Ensure user is passed here
                headerTitle: userRoute.headerTitle,
                currentPath: req.path, // Pass currentPath if needed
                playlist // Pass playlist if applicable
            });

        } catch (error) {
            console.error(`Error handling route ${userRoute.path}:`, error);
            // Pass user to error page if possible
            res.status(500).render('error', { // Assuming you have an error.ejs view
                 pageTitle: 'Error',
                 headerTitle: 'Error', // Add this line
                 message: 'Server Error',
                 error: process.env.NODE_ENV === 'development' ? error : {}, // Show details only in dev
                 user: res.locals.user // Pass user to error page
            });
        }
    });
});

module.exports = router;
