const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const joinBlocktimerController = require('../controllers/joinBlocktimerController'); // Import the controller
const joinGFMController = require('../controllers/joinGFMController'); // Import the controller
const User = require('../models/User'); // Adjust the path to your User model
const Playlist = require("../models/Playlist");
const router = express.Router();    

const userRoutes = [
    { path: '/Live', view: '2-user/2-live', pageTitle: 'Live',  headerTitle: 'LIVE', cssFile: 'css/live.css'},
    { path: '/Forum', view: '2-user/3-forum', pageTitle: 'Forum', headerTitle: 'FORUM', cssFile: 'css/forum.css'},
    { path: '/Archives', view: '2-user/4-archives', pageTitle: 'Archives', headerTitle: 'ARCHIVES' },
    { path: '/Playlist', view: '2-user/5-playlist', pageTitle: 'Playlist', headerTitle: 'PLAYLIST', cssFile: 'css/playlist.css' },
    { path: '/JoinBlocktimer-Step1', view: '2-user/6-blocktimer-1', pageTitle: 'Join Blocktimer - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/blocktimer.css' },
    { path: '/JoinBlocktimer-Step2', controller: joinBlocktimerController.joinBlocktimer2_get, headerTitle: 'STEP 2', auth: true }, // Delegate to the controller
    { path: '/JoinBlocktimer-Step3', view: '2-user/6-blocktimer-3', pageTitle: 'Join Blocktimer - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/blocktimer.css' },
    { path: '/JoinGFM-Step1', view: '2-user/7-joingreenfm-1', pageTitle: 'Join GFM - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/joingreenfm.css' },
    { path: '/JoinGFM-Step2', controller: joinGFMController.joinGFM2_get, headerTitle: 'STEP 2', auth: true },
    { path: '/JoinGFM-Step3', view: '2-user/7-joingreenfm-3', pageTitle: 'Join GFM - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/joingreenfm.css' },
    { path: '/About', view: '2-user/8-about', pageTitle: 'About Us', headerTitle: 'ABOUT US', cssFile: 'css/about.css' },
    { path: '/Contact', view: '2-user/9-contact', pageTitle: 'Contact Us', headerTitle: 'CONTACT US', cssFile: 'css/contact.css' },
    { path: '/ManageAccount', view: '3-logreg/5-manage-account', pageTitle: 'Manage Account', headerTitle: 'MANAGE ACCOUNT', auth: true, cssFile: 'css/manage-account.css' }
];

// Set up routes
userRoutes.forEach(userRoute => {
    router.get(userRoute.path, async (req, res, next) => {
        try {
            let playlist = [];

            // Only fetch playlist if it's the /Playlist route
            if (userRoute.path === '/Playlist') {
                playlist = await Playlist.find().sort({ createdAt: -1 });
            }

            // If the route requires authentication
            if (userRoute.auth) {
                return requireAuth(req, res, async () => {
                    const user = await User.findById(req.user._id);

                    // Check step completion if necessary
                    if (userRoute.path === '/JoinGFM-Step3') {
                        if (!user.completedJoinGFMStep1) return res.redirect('/JoinGFM-Step1');
                        if (!user.completedJoinGFMStep2) return res.redirect('/JoinGFM-Step2');
                    }

                    if (userRoute.path === '/JoinBlocktimer-Step3') {
                        if (!user.completedBlocktimerStep1) return res.redirect('/JoinBlocktimer-Step1');
                        if (!user.completedBlocktimerStep2) return res.redirect('/JoinBlocktimer-Step2');
                    }

                    // Delegate to controller if specified
                    if (userRoute.controller) {
                        return userRoute.controller(req, res, next);
                    }

                    // Render the view if no controller is specified
                    return res.render(userRoute.view, {
                        pageTitle: userRoute.pageTitle,
                        cssFile: userRoute.cssFile,
                        user: res.locals.user,
                        headerTitle: userRoute.headerTitle,
                        redirectUrl: req.query.redirect || '/',
                        playlist
                    });
                });
            }

            // Render the view if no authentication is required
            if (!userRoute.controller) {
                return res.render(userRoute.view, {
                    pageTitle: userRoute.pageTitle,
                    cssFile: userRoute.cssFile,
                    user: res.locals.user,
                    headerTitle: userRoute.headerTitle,
                    currentPath: req.path,
                    playlist // Pass playlist if applicable
                });
            }

            // Delegate to controller if specified
            if (userRoute.controller) {
                return userRoute.controller(req, res, next);
            }
        } catch (error) {
            console.error(`Error handling route ${userRoute.path}:`, error);
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;
