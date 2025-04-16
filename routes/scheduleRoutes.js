const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

router.post('/schedule', scheduleController.postSchedule);
router.get('/schedule', scheduleController.getSchedule);
router.get('/schedule/:id', scheduleController.getScheduleById);
router.patch('/schedule/:id', scheduleController.updateSchedule);
router.delete('/schedule/:id', scheduleController.deleteSchedule);

module.exports = router;
