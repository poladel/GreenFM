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
        // --- Validation & Update Logic ---
        // Basic validation (add more as needed)
        const { roles, department, lastName, firstName, middleInitial, suffix, dlsudEmail, studentNumber } = req.body;

        if (!roles) {
            return res.status(400).json({ message: 'Role is required.' });
        }
        if ((roles === 'Staff' || roles === 'Admin') && !department) {
            return res.status(400).json({ message: 'Department is required for Staff/Admin roles.' });
        }

        const updates = {
            roles,
            department: (roles === 'Staff' || roles === 'Admin') ? department : '', // Clear department if not Staff/Admin
            lastName: lastName || '',
            firstName: firstName || '',
            middleInitial: middleInitial || '',
            suffix: suffix || '',
            dlsudEmail: dlsudEmail || '',
            studentNumber: studentNumber || ''
        };
        // --- End Validation & Update Logic ---


        const updatedUser = await User.findByIdAndUpdate(userId, updates, {
            new: true, // Return the updated document
            runValidators: true // Ensure validation rules are applied
        }).select('-password'); // Exclude password

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' }); // Changed error to message
        }

        // --- Log the updated user object before sending ---
        console.log("[patchUser] Updated user object being sent:", JSON.stringify(updatedUser, null, 2));
        // --- End Log ---

        // --- Emit Socket Event ---
        const io = req.app.get('socketio');
        if (io) {
            // Ensure the object sent via socket also excludes password
            const userForEmit = updatedUser.toObject(); // Convert Mongoose doc to plain object
            delete userForEmit.password; // Ensure password is removed if select didn't catch it
            io.emit('userAccountUpdated', userForEmit);
            console.log(`[patchUser] Emitted userAccountUpdated event for ID: ${userId}`);
        } else {
            console.warn("[patchUser] Socket.IO instance not found. Cannot emit update event.");
        }
        // --- End Emit Socket Event ---

        // Send the updated user object nested under 'user' key
        res.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error('Error updating user:', error);
        // Handle potential validation errors specifically
        if (error.name === 'ValidationError') {
            // Extract validation messages (adjust based on your error structure)
            const errors = Object.values(error.errors).map(el => ({ path: el.path, msg: el.message }));
            return res.status(400).json({ message: 'Validation failed', errors: errors });
        }
        res.status(500).json({ message: 'Failed to update user', error: error.message }); // Changed error to message
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

        // --- Emit Socket.IO event ---
        const io = req.app.get('socketio'); // Get io instance
        if (io) {
            // Emit only the ID of the deleted user
            io.emit('userAccountDeleted', userIdToDelete);
            console.log(`[deleteUser] Emitted userAccountDeleted event for ID: ${userIdToDelete}`);
        } else {
            console.warn("[deleteUser] Socket.IO instance not found. Cannot emit delete event.");
        }
        // --- End Socket.IO ---

        res.status(200).json({ success: true, message: `User ${deletedUser.username} deleted successfully.` });

    } catch (error) {
        console.error(`Error deleting user ${userIdToDelete}:`, error);
        res.status(500).json({ message: 'Failed to delete user.', error: error.message });
    }
};

