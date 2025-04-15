const express = require('express');
const router = express.Router();
//const User = require('../models/User');
const Post = require('../models/Post');

// Define the routes for each 'user' section
const userRoutes = [
    { path: '/', view: '2-user/1-home', pageTitle: 'Home', headerTitle: 'HOME', cssFile: 'css/home.css' },
    { path: '/Home', view: '2-user/1-home', pageTitle: 'Home', headerTitle: 'HOME', cssFile: 'css/home.css' }
];

userRoutes.forEach(userRoute => {
    router.get(userRoute.path, async (req, res) => {
        try {
            let posts = [];

            // Fetch playlist only if the route is '/Playlist'
            if (userRoute.path === '/' || userRoute.path === '/Home') {
                posts = await Post.find().sort({ createdAt: -1 });
            }

            res.render(userRoute.view, {
                pageTitle: userRoute.pageTitle,
                cssFile: userRoute.cssFile,
                headerTitle: userRoute.headerTitle,
                currentPath: req.originalUrl,
                user: res.locals.user,
                posts
            });
        } catch (error) {
            console.error('Error rendering page:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

module.exports = router;
