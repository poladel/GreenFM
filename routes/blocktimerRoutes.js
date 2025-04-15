const express = require('express');
const blocktimerController = require('../controllers/blocktimerController');
const router = express.Router();

router.get('/submissions', blocktimerController.getSubmissions);
router.get('/submissions/:id', blocktimerController.getSubmissionById);

module.exports = router;