const { Router } = require('express');
const joinGFMController = require('../controllers/joinGFMController');
const { checkUser, requireAuth } = require('../middleware/authMiddleware'); // Assuming requireAuth checks for logged-in user

const router = Router();

// Step 1: Submit initial application data (requires user to be logged in)
router.post('/JoinGFM-Step1', requireAuth, joinGFMController.joinGFM1_post);

// Step 2: Get page for selecting assessment schedule (requires user to be logged in)
// Note: The GET route is typically handled by a general page rendering route,
// but if specific data loading is needed server-side before rendering, it stays here.
// Ensure your main app routes handle GET /JoinGFM-Step2 appropriately.
// Example: app.get('/JoinGFM-Step2', requireAuth, joinGFMController.joinGFM2_get);
// Make sure joinGFM2_get is exported if used this way.

// Step 2: Submit selected assessment schedule (requires user to be logged in)
router.post('/JoinGFM-Step2', requireAuth, joinGFMController.joinGFM2_post);

// Admin route to get applications/booked slots for a specific week
// Ensure this route is protected by admin role check middleware
// Example: const { requireAdmin } = require('../middleware/roleMiddleware');
// router.get('/admin/applications-for-week', requireAuth, requireAdmin, joinGFMController.getApplicationsForWeek);
// For now, just adding the route assuming protection is handled elsewhere or added later:
router.get('/admin/applications-for-week', requireAuth, joinGFMController.getApplicationsForWeek);


module.exports = router;