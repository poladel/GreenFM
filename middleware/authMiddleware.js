const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createAccessToken } = require('../controllers/authController');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const requireAuth = async (req, res, next) => {
    const token = req.cookies.jwt; // Access token
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken; // Refresh token

    if (token) {
        jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                // If access token is expired or invalid, check for refresh token
                if (refreshToken) {
                    const user = await User.findOne({ refreshToken });
                    if (!user) {
                        return res.redirect('/LogIn'); // If user not found with refresh token
                    }

                    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
                        if (err) {
                            console.log(err.message);
                            return res.redirect('/LogIn'); // Forbidden
                        }

                        // Create a new access token
                        const newAccessToken = createAccessToken(decoded.id);
                        res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes

                        req.user = user; // Set authenticated user to req.user
                        res.locals.user = user; // Set user information from the database
                        next(); // Proceed to the restricted page
                    });
                } else {
                    return res.redirect('/LogIn'); // No refresh token, redirect
                }
            } else {
                console.log(decodedToken);
                let user = await User.findById(decodedToken.id);
                req.user = user; // Set authenticated user to req.user
                res.locals.user = user; // Set user information if access token is valid
                next(); // Token is valid, proceed to the restricted page
            }
        });
    } else {
        // No access token and no attempt to use refresh token
        if (refreshToken) {
            // Handle case where only refresh token is available
            const user = await User.findOne({ refreshToken });
            if (user) {
                jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
                    if (err) {
                        console.log(err.message);
                        return res.redirect('/LogIn'); // Forbidden
                    }

                    // Create a new access token
                    const newAccessToken = createAccessToken(decoded.id);
                    res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes

                    req.user = user; // Set authenticated user to req.user
                    res.locals.user = user; // Set user information from the database
                    next(); // Proceed to the restricted page
                });
            } else {
                return res.redirect('/LogIn'); // No valid user for refresh token
            }
        } else {
            return res.redirect(`/LogIn?redirect=${encodeURIComponent(req.originalUrl)}`);
        }
    }
};

// Check current user
const checkUser = async (req, res, next) => {
    const token = req.cookies.jwt; // Access token
    const refreshToken = req.cookies.refreshToken; // Refresh token

    if (token) {
        // Verify the access token
        try {
            const decodedToken = jwt.verify(token, ACCESS_TOKEN_SECRET);
            const user = await User.findById(decodedToken.id);
            req.user = user; // Set authenticated user to req.user
            res.locals.user = user; // Access token is valid, set user
            return next();
        } catch (err) {
            console.log('Access token error:', err.message);
            // If access token is invalid, try the refresh token
            if (refreshToken) {
                try {
                    const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
                    const user = await User.findOne({ refreshToken });
                    if (!user) {
                        res.locals.user = null; // No user found with this refresh token
                        return next();
                    }
                    // Create a new access token
                    const newAccessToken = createAccessToken(decodedRefreshToken.id);
                    res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
                    req.user = user; // Set authenticated user to req.user
                    res.locals.user = user; // Set the user from refresh token
                    return next();
                } catch (refreshErr) {
                    console.log('Refresh token error:', refreshErr.message);
                    res.locals.user = null; // Invalid refresh token
                    return next();
                }
            } else {
                res.locals.user = null; // No refresh token, set user to null
                return next();
            }
        }
    } else {
        // No access token, check if refresh token is available
        if (refreshToken) {
            try {
                const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
                const user = await User.findOne({ refreshToken });
                if (!user) {
                    res.locals.user = null; // No user found with refresh token
                    return next();
                }
                // Create a new access token
                const newAccessToken = createAccessToken(decodedRefreshToken.id);
                res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
                req.user = user; // Set authenticated user to req.user
                res.locals.user = user; // Set the user from refresh token
                return next();
            } catch (err) {
                console.log('Refresh token error:', err.message);
                res.locals.user = null; // Invalid refresh token
                return next();
            }
        } else {
            res.locals.user = null; // No token at all, user is null
            return next();
        }
    }
};

// Middleware to check user roles
const checkRoles = (allowedRoles) => {
    return (req, res, next) => {
        const user = res.locals.user; // Assuming user info is stored in res.locals.user
        if (user && user.roles && allowedRoles.includes(user.roles)) {
            return next();
        }
        // Render the restricted view with an alert message
        return res.render('restricted', {
            message: "You do not have permission to access this page. You will be redirected to the home page.",
            redirectUrl: '/' // Redirect to Home or any other page
        });
    };
};

module.exports.requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(403).send('Forbidden');
    }
    next();
};

module.exports = { requireAuth, checkUser, checkRoles };