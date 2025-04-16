const express = require('express');
const blocktimerController = require('../controllers/blocktimerController');
const router = express.Router();

router.get('/submissions', blocktimerController.getSubmissions);
router.get('/submissions/:id', blocktimerController.getSubmissionById);
router.patch('/submissions/:id', blocktimerController.patchSubmission);

module.exports = router;