const allowedOrigins = [
    'https://greenfm955.com', // Your production frontend
    'http://localhost:3000', // Example local frontend port (adjust if different)
    'http://localhost:3001'  // Example local backend port (if needed for specific cases)
    // Add any other domains that need to access your backend
];

module.exports = allowedOrigins;