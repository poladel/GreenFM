const express = require('express');
const accountController = require('../controllers/accountController');
const router = express.Router();

// Route to fetch all users
router.get('/users', accountController.getAllUsers);

// Route to fetch and patch a single user by ID
router.get('/users/:id', accountController.getUserById);

// Route to update (patch) user data
router.patch('/users/:id', accountController.patchUser);

module.exports = router;