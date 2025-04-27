const express = require('express');
const router = express.Router();
const UserArchivesController = require('../controllers/UserArchivesController');
const ArchivesController = require('../controllers/ArchivesController');  // Import ArchivesController
const { checkUserAuth } = require('../middleware/authMiddleware');  // User authentication middleware

// User: View Archives
router.get('/user/archives', checkUserAuth, UserArchivesController.viewArchives);

// User: Fetch Facebook Data (added this route)
router.get('/user/fetch-facebook-data', checkUserAuth, ArchivesController.fetchFacebookData);

module.exports = router;
