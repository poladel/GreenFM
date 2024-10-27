const session = require('express-session');

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use a secret key for session
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create a session until something is stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000 // Session duration in milliseconds (7 days)
    }
});

module.exports = sessionMiddleware;
