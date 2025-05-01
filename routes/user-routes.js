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
    { path: '/Archives', view: '2-user/4-archives', pageTitle: 'Archives', headerTitle: 'ARCHIVES', cssFile: 'css/archive.css' },
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

            let playlist = [];
            if (userRoute.path === '/Playlist') {
                playlist = await Playlist.find().sort({ createdAt: -1 });
            }

            // Handle Archives route specifically
            if (userRoute.path === '/Archives') {
                const Archive = require('../models/Archive');
                const archives = await Archive.find().sort({ createdAt: -1 });
                return res.render(userRoute.view, {
                    pageTitle: userRoute.pageTitle,
                    cssFile: userRoute.cssFile,
                    user: res.locals.user,
                    headerTitle: userRoute.headerTitle,
                    currentPath: req.path,
                    archives
                });
            }            

            // Handle restricted routes (This check might be redundant if requireAuth/checkRoles handle it)
            if (userRoute.restricted) {
                const user = res.locals.user; // Note: res.locals.user is set by checkUser, which runs on GET *
                if (!user || (userRoute.roles && !user.roles.includes(user.roles))) { // Ensure user exists before checking roles
                    return res.render('restricted', {
                        message: 'Access Denied: Insufficient Permissions',
                        redirectUrl: '/'
                    });
                }
            }

            // Delegate to controller if specified
            if (userRoute.controller) {
                return userRoute.controller(req, res, next);
            }

            // Render the view if no controller is specified
            return res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                user: res.locals.user, // Pass user data (might be null for public routes)
                headerTitle: userRoute.headerTitle,
                currentPath: req.path, // Pass currentPath if needed
                playlist // Pass playlist if applicable
            });

        } catch (error) {
            console.error(`Error handling route ${userRoute.path}:`, error);
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;
