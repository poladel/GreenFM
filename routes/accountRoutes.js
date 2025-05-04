const express = require('express');
const accountController = require('../controllers/accountController');
const router = express.Router();
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');


// Route to fetch all users
router.get('/users', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getAllUsers);

// Route to fetch a single user by ID
router.get('/users/:id', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getUserById);
// Route to fetch current logged-in user
router.get('/user', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getCurrentUser); // Assuming this is for the logged-in user's own data

// Route to update (patch) user data
router.patch('/users/:id', requireAuth, checkRoles(['Admin']), accountController.patchUser);

// --- Add Delete Route ---
// Only Admins can delete users
router.delete('/users/:id', requireAuth, checkRoles(['Admin']), accountController.deleteUser);
// --- End Add Delete Route ---

module.exports = router;