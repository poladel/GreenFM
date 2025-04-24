const express = require('express');
const { getStatus, updateStatus } = require('../controllers/statusController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', getStatus);
router.post('/status', requireAuth, updateStatus);

module.exports = router;
