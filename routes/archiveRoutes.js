const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

// Route to display archives page
router.get('/', archiveController.getArchives); // <<< UNCOMMENT THIS LINE

// Route to check if folder name exists before upload
router.post('/check-foldername', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.checkFolderName);

// Route to handle folder creation and initial file upload
router.post('/', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.uploadFiles);

// Route to add more files to an existing folder
router.post('/:id/add-files', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.addFilesToFolder);

// Route to delete a folder
router.delete('/:id', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.deleteFolder);

// Route to delete a specific file from a folder
router.delete('/:id/files', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.deleteFileFromFolder);

// Route to rename a specific file in a folder
router.patch('/:id/files/rename', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.renameFileInFolder);

// Route to rename a folder
router.patch('/:id/rename', requireAuth, checkRoles(['Admin', 'Staff']), archiveController.renameFolder);

module.exports = router;

// No req.io logic should be present in this file.