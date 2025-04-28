const User = require('../models/User');

// Fetch all users
module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password field
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Fetch a single user by ID
module.exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password field
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// Fetch current logged-in user
module.exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password field
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

module.exports.patchUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { roles, department } = req.body;

        // Update only the fields provided
        const updates = {};
        if (roles) updates.roles = roles;
        if (department !== undefined) updates.department = department; // Allow empty string

        const updatedUser = await User.findByIdAndUpdate(userId, updates, {
            new: true, // Return the updated document
            runValidators: true // Ensure validation rules are applied
        });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

