const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();    

// Define the routes for each 'user' section with dynamic titles
const userRoutes = [
    { path: '/Live', view: '2-user/2-live', pageTitle: 'Live' },
    { path: '/Forum', view: '2-user/3-forum', pageTitle: 'Forum' },
    { path: '/Archives', view: '2-user/4-archives', pageTitle: 'Archives' },
    { path: '/Playlist', view: '2-user/5-playlist', pageTitle: 'Playlist' },
    { path: '/JoinBlocktimer-Step1', view: '2-user/6-blocktimer-1', pageTitle: 'Join Blocktimer - Step 1', auth: true },
    { path: '/JoinBlocktimer-Step2', view: '2-user/6-blocktimer-2', pageTitle: 'Join Blocktimer - Step 2', auth: true },
    { path: '/JoinBlocktimer-Step3', view: '2-user/6-blocktimer-3', pageTitle: 'Join Blocktimer - Step 3', auth: true },
    { path: '/JoinGFM-Step1', view: '2-user/7-joingreenfm-1', pageTitle: 'Join GFM - Step 1', auth: true },
    { path: '/JoinGFM-Step2', view: '2-user/7-joingreenfm-2', pageTitle: 'Join GFM - Step 2', auth: true },
    { path: '/JoinGFM-Step3', view: '2-user/7-joingreenfm-3', pageTitle: 'Join GFM - Step 3', auth: true },
    { path: '/About', view: '2-user/8-about', pageTitle: 'About Us' },
    { path: '/Contact', view: '2-user/9-contact', pageTitle: 'Contact Us' }
];

// Define the routes and render views with dynamic titles
userRoutes.forEach(userRoute => {
    if (userRoute.auth) {
        // Apply requireAuth middleware for specific routes
        router.get(userRoute.path, requireAuth, (req, res) => {
            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle, // Pass the page title to the view
                cssFile: 'css/user.css',
                user: res.locals.user
            });
        });
    } else {
        // No authentication required for these routes
        router.get(userRoute.path, (req, res) => {
            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: 'css/user.css',
                user: res.locals.user
            });
        });
    }
});

module.exports = router;
