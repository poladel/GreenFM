const { Router } = require('express');
const staffSubmissionController = require('../controllers/staffSubmissionController'); // Assuming controller functions are here
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

const router = Router();

// ... other admin routes ...

// --- NEW Submission Routes ---
// GET distinct years for filter dropdown
router.get('/admin/submission-years', requireAuth, checkRoles(['Admin']), staffSubmissionController.getSubmissionYears);

// GET submissions based on filters
router.get('/admin/submissions', requireAuth, checkRoles(['Admin']), staffSubmissionController.getSubmissions);

// GET single submission details (optional, can reuse GET /submissions with ID filter)
// router.get('/submissions/:id', requireAuth, checkRoles(['Admin']), staffSubmissionController.getSubmissionById);

// PUT/PATCH update submission result
router.patch('/admin/submissions/:id/result', requireAuth, checkRoles(['Admin']), staffSubmissionController.updateSubmissionResult);
// --- END NEW Submission Routes ---


module.exports = router;