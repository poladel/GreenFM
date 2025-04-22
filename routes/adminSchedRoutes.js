const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const adminSchedController = require('../controllers/adminSchedController');
const router = express.Router();

// Route to save schedule
router.post('/admin/schedule', requireAuth, adminSchedController.createSchedule);
// Route to fetch schedules
router.get('/admin/schedules', requireAuth, adminSchedController.getSchedules);
router.get('/admin/schedule', requireAuth, adminSchedController.getSchedule);
router.patch('/admin/schedule/:id', requireAuth, adminSchedController.updateSchedule);
router.delete('/admin/schedule/:id', requireAuth, adminSchedController.deleteSchedule);

module.exports = router;