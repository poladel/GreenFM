const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Adjust the path to your User model
const router = express.Router();    

// Define the routes for each 'user' section with dynamic titles
const userRoutes = [
    { path: '/Live', view: '2-user/2-live', pageTitle: 'Live',  headerTitle: 'LIVE'},
    { path: '/Forum', view: '2-user/3-forum', pageTitle: 'Forum', headerTitle: 'FORUM', cssFile: 'css/forum.css'},
    { path: '/Archives', view: '2-user/4-archives', pageTitle: 'Archives', headerTitle: 'ARCHIVES' },
    { path: '/Playlist', view: '2-user/5-playlist', pageTitle: 'Playlist', headerTitle: 'PLAYLIST' },
    { path: '/JoinBlocktimer-Step1', view: '2-user/6-blocktimer-1', pageTitle: 'Join Blocktimer - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/blocktimer.css' },
    { path: '/JoinBlocktimer-Step2', view: '2-user/6-blocktimer-2', pageTitle: 'Join Blocktimer - Step 2', headerTitle: 'STEP 2', auth: true, cssFile: 'css/blocktimer2.css' },
    { path: '/JoinBlocktimer-Step3', view: '2-user/6-blocktimer-3', pageTitle: 'Join Blocktimer - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/blocktimer.css' },
    { path: '/JoinGFM-Step1', view: '2-user/7-joingreenfm-1', pageTitle: 'Join GFM - Step 1', headerTitle: 'STEP 1', auth: true, cssFile: 'css/joingreenfm.css' },
    { path: '/JoinGFM-Step2', view: '2-user/7-joingreenfm-2', pageTitle: 'Join GFM - Step 2', headerTitle: 'STEP 2', auth: true, cssFile: 'css/joingreenfm2.css' },
    { path: '/JoinGFM-Step3', view: '2-user/7-joingreenfm-3', pageTitle: 'Join GFM - Step 3', headerTitle: 'STEP 3', auth: true, cssFile: 'css/joingreenfm.css' },
    { path: '/About', view: '2-user/8-about', pageTitle: 'About Us', headerTitle: 'ABOUT US' , cssFile: 'css/about.css'},
    { path: '/Contact', view: '2-user/9-contact', pageTitle: 'Contact Us', headerTitle: 'CONTACT US', cssFile: 'css/contact.css' }
];

// Define the routes and render views with dynamic titles
userRoutes.forEach(userRoute => {
    if (userRoute.auth) {
        // Apply requireAuth middleware for specific routes
        router.get(userRoute.path, requireAuth, async (req, res) => {
            // Check if the current route is JoinGFM-Step3
            if (userRoute.path === '/JoinGFM-Step3') {
                try {
                    // Retrieve the user's completion data from MongoDB
                    const user = await User.findById(req.user._id); // Adjust to match your authentication method

                    // Check completion status
                    const { completedJoinGFMStep1, completedJoinGFMStep2 } = user;

                    // Redirect to JoinGFM-Step1 if the user hasn't completed both steps
                    if (!completedJoinGFMStep1) {
                        return res.redirect('/JoinGFM-Step1');
                    } else if (!completedJoinGFMStep2) {
                        return res.redirect('/JoinGFM-Step2');
                    }
                } catch (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }
            }

            if (userRoute.path === '/JoinBlocktimer-Step3') {
                try {
                    // Retrieve the user's completion data from MongoDB
                    const user = await User.findById(req.user._id); // Adjust to match your authentication method

                    // Check completion status
                    const { completedBlocktimerStep1, completedBlocktimerStep2 } = user;

                    // Redirect to JoinBlocktimer-Step1 if the user hasn't completed both steps
                    if (!completedBlocktimerStep1) {
                        return res.redirect('/JoinBlocktimer-Step1');
                    } else if (!completedBlocktimerStep2) {
                        return res.redirect('/JoinBlocktimer-Step2');
                    }
                } catch (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }
            }

            // Render the view if all conditions are met
            // Check if the current route is JoinGFM-Step3
            if (userRoute.path === '/JoinGFM-Step3') {
                try {
                    // Retrieve the user's completion data from MongoDB
                    const user = await User.findById(req.user._id); // Adjust to match your authentication method

                    // Check completion status
                    const { completedJoinGFMStep1, completedJoinGFMStep2 } = user;

                    // Redirect to JoinGFM-Step1 if the user hasn't completed both steps
                    if (!completedJoinGFMStep1) {
                        return res.redirect('/JoinGFM-Step1');
                    } else if (!completedJoinGFMStep2) {
                        return res.redirect('/JoinGFM-Step2');
                    }
                } catch (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }
            }

            if (userRoute.path === '/JoinBlocktimer-Step3') {
                try {
                    // Retrieve the user's completion data from MongoDB
                    const user = await User.findById(req.user._id); // Adjust to match your authentication method

                    // Check completion status
                    const { completedBlocktimerStep1, completedBlocktimerStep2 } = user;

                    // Redirect to JoinBlocktimer-Step1 if the user hasn't completed both steps
                    if (!completedBlocktimerStep1) {
                        return res.redirect('/JoinBlocktimer-Step1');
                    } else if (!completedBlocktimerStep2) {
                        return res.redirect('/JoinBlocktimer-Step2');
                    }
                } catch (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }
            }

            // Render the view if all conditions are met
            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                user: res.locals.user,
                headerTitle: userRoute.headerTitle,
                redirectUrl: req.query.redirect || '/'
            });
        });
    } else {
        // No authentication required for these routes
        router.get(userRoute.path, (req, res) => {
            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                user: res.locals.user,
                headerTitle: userRoute.headerTitle,
                currentPath: req.path,
                isAuthenticated: !!res.locals.user
            });
        });
    }
});

module.exports = router;
