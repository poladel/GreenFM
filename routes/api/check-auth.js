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
