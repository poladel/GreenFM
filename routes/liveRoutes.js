const express = require('express');
const router = express.Router();
const { getComments, getUsername } = require('../controllers/liveController');

// Route for getting all live comments
router.get('/comments', getComments);

// Route for getting the current user's username
router.get('/username', getUsername);

module.exports = router;
