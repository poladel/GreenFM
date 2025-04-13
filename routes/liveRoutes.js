const express = require('express');
const router = express.Router();
const liveController = require('../controllers/liveController');

// GET live video page
router.get('/', liveController.getLive);

// POST to add a new live video
router.post('/add', liveController.addLive);

// POST to remove the current live video (optional)
router.post('/remove', liveController.removeLive);

module.exports = router;
