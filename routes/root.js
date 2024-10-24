const express = require('express');
const router = express.Router();

// Define the routes for each 'user' section
const userRoutes = [
    { path: '/', view: '2-user/1-home', pageTitle: 'Home' },
    { path: '/Home', view: '2-user/1-home', pageTitle: 'Home' }
];

userRoutes.forEach(userRoute => {
    router.get(userRoute.path, (req, res) => {
        res.render(userRoute.view, {
            pageTitle: userRoute.pageTitle, // Pass the page title to the view
            cssFile: 'css/user.css'
        });
    });
});

module.exports = router;
