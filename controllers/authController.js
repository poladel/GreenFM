const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Function: Handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { email: '', username: '', password: ''};

    //Register
    // Validation Errors
    if (err.message.includes('user validation failed')){
        Object.values(err.errors).forEach(({properties}) => {
            errors[properties.path] = properties.message;
        });
    }

    // Custom error handling for manual uniqueness check
    //Existing Email
    if (err.message === 'Email already registered') {
        errors.email = 'Email already registered';
    }

    //Existing Username
    if (err.message === 'Username already exists') {
        errors.username = 'Username already exists';
    }
    if (err.message === 'Minimum of 5 Characters') {
        errors.username = 'Minimum of 5 characters';
    }

    // Password Requirements
    if (err.message === 'Minimum of 8 Characters') {
        errors.password += 'Minimum of 8 characters. ';
    }
    if (err.message === 'At least one uppercase letter') {
        errors.password += 'At least one uppercase letter. ';
    }
    if (err.message === 'At least one lowercase letter') {
        errors.password += 'At least one lowercase letter. ';
    }
    if (err.message === 'At least one number') {
        errors.password += 'At least one number. ';
    }
    if (err.message === 'At least one special character') {
        errors.password += 'At least one special character. ';
    }

    //Log in
    // Incorrect username
    if (err.message === 'Username does not exist') {
        errors.username = 'Username does not exist';
    }
    // Incorrect password
    if (err.message === 'Incorrect Password') {
        errors.password = 'Incorrect password';
    }

    return errors;
}


// Function to create access token
const createAccessToken = (id) => {
    return jwt.sign({ id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

// Function to create refresh token
const createRefreshToken = (id) => {
    return jwt.sign({ id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}


module.exports.login_get = (req, res) => {
    const redirectUrl = req.query.redirect || '/';
    res.render('3-logreg/1-login', {
        pageTitle: 'Log In',
        cssFile: 'css/login.css',
        redirectUrl // Pass redirectUrl to the login view
    });
}

module.exports.register_get = (req, res) => {
    res.render('3-logreg/2-register-1', {
        pageTitle: 'Register',
        cssFile: 'css/register.css',
    });
}

// Additional User Info Form
module.exports.additional_info_get = (req, res) => {
    res.render('3-logreg/2-register-2', {
        pageTitle: 'Additional Information',
        cssFile: '/css/add-info.css'
    });
};

// Register User
module.exports.register_post = async (req, res) => {
    const { email, username, password } = req.body;
    let errors = {};

    try {
        const emailExists = await User.findOne({ email });
        const usernameExists = await User.findOne({ username });

        if (emailExists) {
            errors.email = 'Email already registered';
        }

        if (usernameExists) {
            errors.username = 'Username already exists';
        }
        
        // Username validation
        if (username.length < 5) {
            errors.username = 'Minimum of 5 characters';
        }

        // Password validation
        if (password.length < 8) {
            errors.password = 'Minimum of 8 characters';
        } else {
            // Proceed with further checks only if the password is at least 8 characters
            if (!/[A-Z]/.test(password)) {
                errors.password = 'At least one uppercase letter';
            } else if (!/[a-z]/.test(password)) {
                errors.password = 'At least one lowercase letter';
            } else if (!/[0-9]/.test(password)) {
                errors.password = 'At least one number';
            } else if (!/[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/]/.test(password)) {
                errors.password = 'At least one special character';
            }
        }

        // If errors exist, return them
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        // Store email, username, and password in session
        req.session.registrationData = { email, username, password };

        // Respond with a success message
        return res.status(200).json({ success: true });
    } catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
};

// Additional User Info Submission
module.exports.additional_info_post = async (req, res) => {
    const { lastName, firstName, middleInitial, dlsuD, dlsudEmail } = req.body;

    // Check if registrationData exists in session
    if (!req.session.registrationData) {
        // Respond with a custom status for handling on the client side
        return res.status(400).json({ 
            error: 'Please return and provide your email, username, and password to complete registration.' 
        });
    }

    // Retrieve initial data from session
    const { email, username, password } = req.session.registrationData;

    try {
        // Create the user with all data
        const user = await User.create({
            email,
            username,
            password, // Make sure to hash this before saving
            lastName,
            firstName,
            middleInitial: middleInitial || '',
            dlsuD: dlsuD === 'true' || dlsuD === true,
            dlsudEmail
        });

        console.log('User Created:', user); // Log the user creation

        // Optionally create tokens, set cookies, etc., similar to your current setup
        const accessToken = createAccessToken(user._id);
        const refreshToken = createRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        // Set access and refresh tokens in cookies
        res.cookie('jwt', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
        res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

        // Clear session data
        req.session.registrationData = null;

        // Respond with success
        res.json({ success: true }); // Send success response
    } catch (error) {
        console.error('Error saving additional user information:', error);
        res.status(500).json({ error: 'Failed to save user information' });
    }
};



// User Log In
module.exports.login_post = async (req, res) => {
    const { username, password, redirect } = req.body;

    try {
        const user = await User.login(username, password);

        const accessToken = createAccessToken(user._id);
        const refreshToken = createRefreshToken(user._id);

        // Store refresh token in the database
        user.refreshToken = refreshToken;
        await user.save();

        // Set access token in cookie
        res.cookie('jwt', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

        console.log('Redirect parameter after login:', redirect);
        // Check for redirect parameter
        const redirectUrl = redirect || '/'; // Default to homepage if not provided
        
        // Return the user and redirect URL in the response
        return res.status(200).json({ user: user._id, redirect: redirectUrl });
    } catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
};

// Refresh Access Token
module.exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) return res.sendStatus(401); // Unauthorized
    const user = await User.findOne({ refreshToken });
    
    if (!user) return res.sendStatus(403); // Forbidden

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decodedToken) => {
        if (err) {
            console.log(err.message);
            return res.sendStatus(403); // Forbidden
        }

        const accessToken = createAccessToken(decodedToken.id);
        res.cookie('jwt', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
        res.json({ accessToken });
    });
}

// Logout User
module.exports.logout_get = async (req, res) => {
    const { jwt: accessToken, refreshToken } = req.cookies;

    if (!accessToken && !refreshToken) {
        return res.sendStatus(204); // No Content if no tokens are present
    }

    // If refreshToken exists in cookies, clear it
    if (refreshToken) {
        try {
            // Optionally, you can still find the user by refresh token for logging purposes
            const user = await User.findOne({ refreshToken });

            if (user) {
                console.log(`User ${user.username} is logging out.`);
            }
        } catch (err) {
            console.error('Error finding user during logout:', err);
            return res.status(500).send('Server error'); // Handle errors
        }
    }

    // Clear both access and refresh tokens in cookies
    res.cookie('jwt', '', { maxAge: 1 });
    res.cookie('refreshToken', '', { maxAge: 1 });

    res.redirect('/');
}



// Add this line to the end of authController.js
module.exports.createAccessToken = createAccessToken;