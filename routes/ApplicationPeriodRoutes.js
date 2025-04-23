const express = require('express');
const router = express.Router();
const ApplicationPeriodController = require('../controllers/ApplicationPeriodController');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware'); // Import the middleware

// Route to save route settings (start and end dates)
router.post('/admin/application-period', requireAuth, checkRoles(['Admin']), ApplicationPeriodController.saveApplicationPeriod);

// Route to get route settings
router.get('/admin/application-period', ApplicationPeriodController.getApplicationPeriod);

module.exports = router;