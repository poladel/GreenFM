const User = require('../models/User');
// Assuming you have socket.io setup in your main app file (e.g., app.js or server.js)
// and can access the io instance. You might need to pass it down or use a shared module.
// Example: const io = require('../server').io; // Adjust path as needed

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

// Delete a user by ID
module.exports.deleteUser = async (req, res) => {
    const userIdToDelete = req.params.id;
    const requestingUserId = req.user.id; // ID of the admin performing the action

    // Optional: Prevent admin from deleting themselves
    if (userIdToDelete === requestingUserId) {
        return res.status(400).json({ message: 'Admins cannot delete their own account.' });
    }

    try {
        const deletedUser = await User.findByIdAndDelete(userIdToDelete);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log(`User ${deletedUser.username} (ID: ${userIdToDelete}) deleted by Admin ${requestingUserId}`);

        // --- Optional: Emit Socket.IO event ---
        // Ensure you have access to your 'io' instance here
        // This requires proper setup in your main server file
        const io = req.app.get('socketio'); // Example: Get io instance set on the app
        if (io) {
            io.emit('userAccountDeleted', userIdToDelete); // Broadcast to all connected clients
            console.log(`Emitted userAccountDeleted event for ID: ${userIdToDelete}`);
        } else {
            console.warn("Socket.IO instance not found on req.app. Could not emit userAccountDeleted event.");
        }
        // --- End Optional Socket.IO ---


        // Respond with success
        res.status(200).json({ success: true, message: `User ${deletedUser.username} deleted successfully.` });

    } catch (error) {
        console.error(`Error deleting user ${userIdToDelete}:`, error);
        res.status(500).json({ message: 'Failed to delete user.', error: error.message });
    }
};

