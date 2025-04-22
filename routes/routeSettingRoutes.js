const express = require('express');
const router = express.Router();
const routeSettingsController = require('../controllers/routeSettingsController');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware'); // Import the middleware

// Route to save route settings (start and end dates)
router.post('/admin/route-settings', requireAuth, checkRoles(['Admin']), routeSettingsController.saveRouteSettings);

// Route to get route settings
router.get('/admin/route-settings', routeSettingsController.getRouteSettings);

module.exports = router;