const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Handle feedback form submission
router.post('/send', contactController.sendFeedback);

module.exports = router;
