const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Schedule = require('../models/Schedule');

const userRoutes = [
    { path: '/', view: '2-user/1-home', pageTitle: 'Home', headerTitle: 'HOME', cssFile: 'css/home.css' },
    { path: '/Home', view: '2-user/1-home', pageTitle: 'Home', headerTitle: 'HOME', cssFile: 'css/home.css' }
];

userRoutes.forEach(userRoute => {
    router.get(userRoute.path, async (req, res) => {
        try {
            let posts = [];
            let schedule = [];

            // Fetch posts and schedule only for '/' or '/Home'
            if (userRoute.path === '/' || userRoute.path === '/Home') {
                posts = await Post.find().sort({ createdAt: -1 });

                // Get the current day (e.g., "Tuesday")
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const today = days[new Date().getDay()];

                // Fetch the schedule for the current day
                const fullSchedule = await Schedule.findOne();
                if (fullSchedule && fullSchedule[today]) {
                    schedule = fullSchedule[today];
                }
            }

            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                headerTitle: userRoute.headerTitle,
                currentPath: req.originalUrl,
                user: res.locals.user,
                posts,
                schedule // Pass the filtered schedule to the template
            });
        } catch (error) {
            console.error('Error rendering page:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

module.exports = router;
