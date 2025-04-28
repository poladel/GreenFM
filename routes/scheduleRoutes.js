const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/schedule', scheduleController.postSchedule);
router.get('/schedule', scheduleController.getSchedule);
router.get('/schedule/:id', scheduleController.getScheduleById);
router.patch('/schedule/:id', scheduleController.updateSchedule);
router.delete('/schedule/:id', scheduleController.deleteSchedule);
router.get('/schedule/bySubmission/:submissionId', requireAuth, scheduleController.getScheduleBySubmissionId);

module.exports = router;
