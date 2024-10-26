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
    res.render('3-logreg/1-login', {
        pageTitle: 'Log In',
        cssFile: 'css/login.css'
    });
}

module.exports.register_get = (req, res) => {
    res.render('3-logreg/2-register', {
        pageTitle: 'Register',
        cssFile: 'css/register.css'
    });
}

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

        // If both errors exist, return them without creating a user
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }


        // Create the user if no duplicates found
        const user = await User.create({ email, username, password });
        console.log('User Created:', user); // Log the user creation

        const accessToken = createAccessToken(user._id);
        const refreshToken = createRefreshToken(user._id);

        // Store in the database
        user.refreshToken = refreshToken;
        await user.save();

        // Set access token in cookie
        res.cookie('jwt', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
        res.status(201).json({ user: user._id, refreshToken });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
};

module.exports.login_post = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await User.login(username, password);

        const accessToken = createAccessToken(user._id);
        const refreshToken = createRefreshToken(user._id);

        // Store in the database
        user.refreshToken = refreshToken;
        await user.save();

        // Set access token in cookie
        res.cookie('jwt', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 minutes
        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
        res.status(201).json({ user: user._id, refreshToken });
    } catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
}

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