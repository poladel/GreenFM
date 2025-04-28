const session = require('express-session');
const MongoStore = require('connect-mongo');

// Determine if running in production based on NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';

// Ensure SESSION_SECRET and MONGODB_URI are set in your environment variables
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key'; // Use a fallback for dev, but WARN if not set
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
    process.exit(1); // Exit if DB connection string is missing
}

if (!process.env.SESSION_SECRET && !isProduction) {
    console.warn("Warning: SESSION_SECRET environment variable is not set. Using insecure fallback for development.");
} else if (!process.env.SESSION_SECRET && isProduction) {
     console.error("FATAL ERROR: SESSION_SECRET environment variable must be set in production!");
     process.exit(1); // Exit if secret is missing in production
}


const sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Set secure only in production (HTTPS)
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        // Consider SameSite attribute for security (Lax is often a good default)
        // sameSite: 'Lax' // or 'None' if you need cross-site cookies (requires secure: true)
        httpOnly: true // Helps prevent XSS attacks (usually default, but good to be explicit)
    },
    // Use MongoStore for persistent sessions
    store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions', // Optional: name for the sessions collection
        // mongoOptions: { useUnifiedTopology: true } // Add any necessary mongo options
    })
});

module.exports = sessionMiddleware;