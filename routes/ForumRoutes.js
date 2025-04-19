const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { requireAuth } = require('../middleware/authMiddleware');
const ForumPost = require('../models/ForumPost');

router.post('/posts', requireAuth, forumController.handleFileUploads, forumController.createPost);
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);
router.put('/posts/:id', requireAuth, forumController.handleFileUploads, forumController.updatePost);
router.delete('/posts/:id', requireAuth, forumController.deletePost);
router.post('/posts/:id/like', requireAuth, forumController.toggleLike);
router.post('/posts/:id/comment', requireAuth, forumController.addComment);
router.get('/posts/:id/comments', forumController.getComments);


module.exports = router;