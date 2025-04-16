const User = require("../models/User");
const bcrypt = require('bcrypt'); // Ensure bcrypt is imported

module.exports.userData_get = async (req, res) => {
    try {
        // Fetch user data from the database (replace with your actual query)
        const user = await User.findById(req.user.id); // Assuming `req.user.id` contains the logged-in user's ID

        // Render the EJS template and pass the user data
        res.render('3-logreg/5-manage-account', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports.userData_post = async (req, res) => {
    try {
        console.log('Request Body:', req.body); // Debugging: Log request body

        const { username, email, lastName, firstName, middleInitial, suffix, dlsudEmail, studentNumber } = req.body;

        // Update user data in the database
        const user = await User.findByIdAndUpdate(req.user.id, {
            username,
            email,
            lastName,
            firstName,
            middleInitial,
            suffix,
            dlsudEmail,
            studentNumber
        }, { new: true }); // Return the updated user

        console.log('Updated User:', user); // Debugging: Log updated user

        return res.status(200).json({ message: `${user.username} info has been edited` });
    } catch (err) {
        console.error('Error in userData_post:', err);
        res.status(500).send('Server Error');
    }
};

module.exports.change_password = async (req, res) => {
    const { email, oldPassword, newPassword, confirmNewPassword } = req.body;

    try {
        console.log('Reset password request received for email:', email); // Debugging log

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the old password matches the stored hashed password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }

        // Check if the new passwords match
        if (newPassword !== confirmNewPassword) {
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

        // Redirect to /LogOut route
        return res.status(200).json({ message: 'Password reset successfully. Logging out the user.', redirect: '/LogOut' });
    } catch (err) {
        console.error('Error in change_password:', err);
        res.status(500).json({ error: 'An error occurred while resetting the password' });
    }
};



