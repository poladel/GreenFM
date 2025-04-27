const express = require('express');
const blocktimerController = require('../controllers/blocktimerController');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/submissions', blocktimerController.getSubmissions);
router.get('/submissions/:id', blocktimerController.getSubmissionById);

// --- ADD NEW ROUTE ---
router.get('/my-latest-submission', requireAuth, blocktimerController.getMyLatestSubmission);

// Use PATCH for updating an existing resource
router.patch('/submissions/:id', requireAuth, blocktimerController.updateSubmissionResult);

// Routes for user confirmation/acknowledgement
router.post('/submissions/:id/confirm', requireAuth, blocktimerController.confirmSchedule);
router.post('/submissions/:id/reject-change', requireAuth, blocktimerController.rejectScheduleChange);
router.post('/submissions/:id/acknowledge', requireAuth, blocktimerController.acknowledgeResult);

module.exports = router;