// Example in your admin routes file (e.g., routes/adminRoutes.js)
const express = require('express');
const router = express.Router();
const adminSchedController = require('../controllers/adminSchedController');
const { requireAuth } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// Apply auth middleware to all admin schedule routes
router.use('/admin/schedule*', requireAuth); // Example: Protect all schedule routes

// Routes for RECURRING schedules
router.post('/admin/schedule', adminSchedController.createSchedule); // Create recurring
router.get('/admin/schedules', adminSchedController.getSchedules);   // Get all recurring for year/dept (for grid display)
router.get('/admin/schedule', adminSchedController.getSchedule);     // Get SINGLE recurring for year/dept/day/time (for modal context) - MODIFIED
router.patch('/admin/schedule/:id', adminSchedController.updateSchedule); // Update recurring
router.delete('/admin/schedule/:id', adminSchedController.deleteSchedule); // Delete recurring

// Routes for SPECIFIC DATE overrides
router.post('/admin/schedule-override', adminSchedController.createOrUpdateOverride); // Create/Update override - NEW
router.delete('/admin/schedule-override/:id', adminSchedController.deleteOverride); // Delete override by ID - NEW (Optional)
router.post('/admin/schedule-override/make-available', adminSchedController.createAvailabilityOverride); // NEW ROUTE
// You might have another DELETE route using query params if needed

// Route for Combined Weekly View
router.get('/admin/weekly-schedule', adminSchedController.getWeeklyAvailability); // Get combined data for a week - NEW

module.exports = router;