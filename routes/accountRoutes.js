const express = require('express');
const accountController = require('../controllers/accountController');
const router = express.Router();
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');


// Route to fetch all users
//router.get('/users', accountController.getAllUsers);
router.get('/users', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getAllUsers);

// Route to fetch and patch a single user by ID
router.get('/users/:id', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getUserById);
// Route to fetch and patch a single user by ID
router.get('/user', requireAuth, checkRoles(['Admin', 'Staff']), accountController.getCurrentUser);

// Route to update (patch) user data
router.patch('/users/:id', requireAuth, checkRoles(['Admin', 'Staff']), accountController.patchUser);

module.exports = router;