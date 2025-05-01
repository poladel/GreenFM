const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');

// Routes
router.get('/archives', archiveController.getArchives);
router.post('/upload', archiveController.uploadFiles); // Multer handled inside controller

module.exports = router;