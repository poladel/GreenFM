const express = require('express');
const router = express.Router();
const ApplicationPeriodController = require('../controllers/applicationPeriodController');
const AssessmentPeriodController = require('../controllers/assessmentPeriodController'); // Keep for GET
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

// POST handles BOTH Application and Assessment periods now
router.post('/admin/application-period', requireAuth, checkRoles(['Admin']), ApplicationPeriodController.saveApplicationPeriod);
// GET routes remain separate
router.get('/admin/application-period', ApplicationPeriodController.getApplicationPeriod);
router.get('/admin/assessment-period', AssessmentPeriodController.getAssessmentPeriod); // Keep GET

module.exports = router;