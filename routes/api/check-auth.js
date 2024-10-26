/*const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

const checkAuth = async (req, res) => {
    const token = req.cookies.jwt; // Access token
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken; // Refresh token

    if (token) {
        // Verify the access token
        jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                // If access token is expired or invalid, check for refresh token
                if (refreshToken) {
                    const user = await User.findOne({ refreshToken });
                    if (!user) {
                        return res.json({ isAuthenticated: false }); // User not found with refresh token
                    }

                    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
                        if (err) {
                            console.log(err.message);
                            return res.json({ isAuthenticated: false }); // Refresh token invalid
                        }

                        // Create a new access token
                        const newAccessToken = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' }); // 15 minutes
                        res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // Set new access token in the cookie

                        res.locals.user = user; // Set user information from the database
                        return res.json({ isAuthenticated: true, user: decoded }); // Respond with authenticated status
                    });
                } else {
                    return res.json({ isAuthenticated: false }); // No refresh token, not authenticated
                }
            } else {
                // Token is valid
                console.log(decodedToken);
                const user = await User.findById(decodedToken.id);
                if (!user) {
                    return res.json({ isAuthenticated: false }); // User not found
                }
                res.locals.user = user; // Set user information if access token is valid
                return res.json({ isAuthenticated: true, user: decodedToken }); // Respond with authenticated status
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
                        return res.json({ isAuthenticated: false }); // Refresh token invalid
                    }

                    // Create a new access token
                    const newAccessToken = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
                    res.cookie('jwt', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // Set new access token in the cookie

                    res.locals.user = user; // Set user information from the database
                    return res.json({ isAuthenticated: true, user: decoded }); // Respond with authenticated status
                });
            } else {
                return res.json({ isAuthenticated: false }); // No valid user for refresh token
            }
        } else {
            return res.json({ isAuthenticated: false }); // No token found
        }
    }
};

module.exports = { checkAuth };
*/


const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

const checkAuth = async (req, res) => {
    const token = req.cookies.jwt; // Access token
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken; // Refresh token

    if (token) {
        // Verify the access token
        jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                // Handle refresh token logic...
            } else {
                // Token is valid
                const user = await User.findById(decodedToken.id);
                if (!user) {
                    return res.json({ isAuthenticated: false }); // User not found
                }
                return res.json({ isAuthenticated: true }); // Respond with authenticated status
            }
        });
    } else {
        return res.json({ isAuthenticated: false }); // No token found
    }
};

module.exports = { checkAuth };
