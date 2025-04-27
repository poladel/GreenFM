const express = require('express');
const router = express.Router();
const AdminArchivesController = require('../controllers/AdminArchivesController');

// Route to view all posts in the archives
router.get('/admin/archives', AdminArchivesController.viewArchives);

// Route to add a new Facebook live post or image post
router.post('/admin/add-post', AdminArchivesController.addPost);

module.exports = router;
