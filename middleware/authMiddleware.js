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
        const user = res.locals.user; // Get user from res.locals

        // 1. Check if user exists and has roles defined
        if (!user || !user.roles) {
            console.warn(`[checkRoles Middleware] Access denied: User or user.roles undefined for path ${req.originalUrl}.`);
            // Check if it's likely an API request (accepts JSON) vs a page request
            if (req.accepts('json') && !req.accepts('html')) {
                return res.status(401).json({ message: "Authentication error. Please log in again." });
            } else {
                return res.render('restricted', {
                    message: "Authentication error. Please log in again.",
                    redirectUrl: '/LogIn' // Redirect to login if user data is missing
                });
            }
        }

        // 2. Ensure user.roles is treated as an array
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];

        // 3. Check if any of the user's roles match any of the allowed roles
        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        // 4. Grant or deny access
        if (hasPermission) {
            console.log(`[checkRoles Middleware] Access granted for user ${user.username} (Roles: ${userRoles.join(', ')}) to path ${req.originalUrl} (Allowed: ${allowedRoles.join(', ')})`);
            return next(); // User has at least one allowed role
        } else {
            console.warn(`[checkRoles Middleware] Access DENIED for user ${user.username} (Roles: ${userRoles.join(', ')}) to path ${req.originalUrl} (Allowed: ${allowedRoles.join(', ')})`);
            // Check if the request prefers JSON (typical for API calls from JS)
            if (req.accepts('json') && !req.accepts('html')) {
                 return res.status(403).json({ message: "Forbidden: You do not have permission to perform this action." });
            } else {
                // Render HTML page for regular page navigation attempts
                // *** FIX: Set status code to 403 when rendering restricted page for role denial ***
                return res.status(403).render('restricted', {
                    message: "Forbidden: You do not have permission to access this resource.", // Adjusted message slightly
                    redirectUrl: '/' // Or maybe redirect to a more appropriate page like '/login' or '/'
                });
            }
        }
    };
};

module.exports = { requireAuth, checkUser, checkRoles };