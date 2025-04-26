const express = require('express');
const router = express.Router();
const ApplicationPeriodController = require('../controllers/ApplicationPeriodController');
const AssessmentPeriodController = require('../controllers/assessmentPeriodController'); // Keep for GET
const joinGFMController = require('../controllers/joinGFMController'); // Add if not already present
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

// POST handles BOTH Application and Assessment periods now
router.post('/admin/application-period', requireAuth, checkRoles(['Admin']), ApplicationPeriodController.saveApplicationPeriod);
// GET routes remain separate
router.get('/admin/application-period', ApplicationPeriodController.getApplicationPeriod);
router.get('/admin/assessment-period', AssessmentPeriodController.getAssessmentPeriod); // Keep GET

// --- NEW: Route to get applications for a specific week/dept ---
router.get('/admin/applications-for-week', requireAuth, checkRoles(['Admin']), joinGFMController.getApplicationsForWeek);
// --- End NEW ---

module.exports = router;