const { Router } = require('express');
const staffSubmissionController = require('../controllers/staffSubmissionController');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

const router = Router();

// --- Admin Routes ---
router.get('/admin/submission-years', requireAuth, checkRoles(['Admin']), staffSubmissionController.getSubmissionYears);
router.get('/admin/submissions', requireAuth, checkRoles(['Admin']), staffSubmissionController.getSubmissions);
router.patch('/admin/submissions/:id/result', requireAuth, checkRoles(['Admin']), staffSubmissionController.updateSubmissionResult);

// --- User Routes ---
router.get('/my-latest-staff-application', requireAuth, staffSubmissionController.getMyLatestStaffApplication);
router.post('/staff-applications/:id/acknowledge', requireAuth, staffSubmissionController.acknowledgeStaffResult);


module.exports = router;