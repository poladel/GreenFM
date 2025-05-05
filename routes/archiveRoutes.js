const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');

// Routes
router.get('/archives', archiveController.getArchives);
router.post('/upload', archiveController.uploadFiles); // Multer handled inside controller
router.delete('/archives/:id', archiveController.deleteFolder);
router.post('/archives/:id/add-files', archiveController.addFilesToFolder);
router.delete('/archives/:id/files', archiveController.deleteFileFromFolder);

module.exports = router;