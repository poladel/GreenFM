const express = require('express');
const router = express.Router();
const { getComments } = require('../controllers/liveController');

// Route for getting all live comments
router.get('/comments', getComments);

module.exports = router;
