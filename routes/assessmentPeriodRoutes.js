const express = require('express');
const router = express.Router();
const AssessmentPeriodController = require('../controllers/assessmentPeriodController'); // Adjust path if needed
const { requireAuth, checkRoles } = require('../middleware/authMiddleware'); // Adjust path if needed

// GET Assessment Period
router.get('/admin/assessment-period', AssessmentPeriodController.getAssessmentPeriod);

// POST (or PUT) Assessment Period - Handles ONLY Assessment Period Data
router.post('/admin/assessment-period', requireAuth, checkRoles(['Admin']), AssessmentPeriodController.saveAssessmentPeriod);

module.exports = router;