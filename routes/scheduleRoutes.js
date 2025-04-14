const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

router.get('/schedule', scheduleController.getSchedule);
router.post('/schedule', scheduleController.updateSchedule);

module.exports = router;
