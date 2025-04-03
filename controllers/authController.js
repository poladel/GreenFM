const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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

module.exports.manage_account_get = (req, res) => {
    const redirectUrl = req.query.redirect || '/';
    res.render('3-logreg/5-manage-account', {
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

//Forgot Password Form
module.exports.forgot_password_get = (req, res) => {
    res.render('3-logreg/3-forgot-password', {
        pageTitle: 'Forgot Password',
        cssFile: '/css/login.css'
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
    const { lastName, firstName, middleInitial, dlsuD, dlsudEmail, studentNumber } = req.body;

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
            dlsudEmail,
            studentNumber
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

        // Check if user has completed both steps
        const completedStep1 = user.completedJoinGFMStep1; // Adjust according to your user schema
        const completedStep2 = user.completedJoinGFMStep2; // Adjust according to your user schema
        let redirectUrl;

        if (completedStep1 && completedStep2) {
            // If the user has completed both steps, check if there is a redirect URL from the login request
            redirectUrl = redirect || '/JoinGFM-Step3'; // Default to JoinGFM-Step3 if no redirect provided
        } else if (completedStep1) {
            // Fallback to query parameter if exists
            redirectUrl = redirect || '/JoinGFM-Step2';
        } else {
            redirectUrl = redirect;
        }

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

module.exports.forgot_password_post = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        // Save the token and expiry to the user document
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Create a nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // Use your email service (e.g., Gmail, Outlook)
            auth: {
                user: process.env.GMAIL_USER, // Your email address
                pass: process.env.GMAIL_PASS  // Your email password or app password
            }
        });

        // Email content
        const resetUrl = `${req.protocol}://${req.get('host')}/LogIn/ResetPassword/${resetToken}`;
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>You requested a password reset for your Green FM account.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>This link will expire in 1 hour.</p>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
};


module.exports.reset_password_get = async (req, res) => {
    try {
        console.log('Reset token received:', req.params.token); // Debugging log

        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() } // Ensure the token has not expired
        });

        if (!user) {
            console.log('No user found with the provided reset token or token expired'); // Debugging log
            return res.status(404).send('Invalid or expired reset token');
        }

        console.log('User found:', user.email); // Debugging log
        res.render('3-logreg/4-reset-password', {
            user,
            pageTitle: 'Reset Password', // Pass the page title
            cssFile: '/css/register.css' // Optional: Pass a CSS file if needed
        });
    } catch (err) {
        console.error('Error in reset_password_get:', err);
        res.status(500).send('Server error');
    }
};

module.exports.reset_password_post = async (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body;

    try {
        console.log('Reset password request received for email:', email); // Debugging log

        // Check if the passwords match
        if (newPassword !== confirmNewPassword) {
            console.log('Passwords do not match'); // Debugging log
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Validate password requirements
        const errors = [];
        if (newPassword.length < 8) {
            errors.push('Password must be at least 8 characters long.');
        }
        if (!/[A-Z]/.test(newPassword)) {
            errors.push('Password must contain at least one uppercase letter.');
        }
        if (!/[a-z]/.test(newPassword)) {
            errors.push('Password must contain at least one lowercase letter.');
        }
        if (!/[0-9]/.test(newPassword)) {
            errors.push('Password must contain at least one number.');
        }
        if (!/[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/]/.test(newPassword)) {
            errors.push('Password must contain at least one special character.');
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
            console.log('Password validation errors:', errors); // Debugging log
            return res.status(400).json({ error: errors.join(' ') });
        }

        // Hash the new password
        console.log('Hashing the new password'); // Debugging log
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password and clear the reset token
        const updatedUser = await User.findOneAndUpdate(
            { email },
            {
                password: hashedPassword, // Save the hashed password
                resetToken: null,
                resetTokenExpiry: null
            },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            console.log('User not found for email:', email); // Debugging log
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Password reset successfully for email:', email); // Debugging log
        res.status(200).json({ message: 'Password reset successfully', username: updatedUser.username });
    } catch (err) {
        console.error('Error in reset_password_post:', err); // Debugging log
        res.status(500).json({ error: 'An error occurred while resetting the password' });
    }
};

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