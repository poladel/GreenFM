const { Router } = require('express');
const postController = require('../controllers/postController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();

// Route to handle post creation
router.post('/post', requireAuth, postController.upload.fields([{ name: 'media', maxCount: 6 }, { name: 'video', maxCount: 1 }]), postController.createPost);

// Route to fetch all posts
router.get('/posts', postController.getAllPosts);

// Route to update a post
router.put('/post/:id', requireAuth, postController.updatePost);

// Route to delete a post
router.delete('/post/:id', requireAuth, postController.deletePost);

// Toggle like
router.post('/post/:id/like', requireAuth, postController.toggleLike);

// Add comments
router.post('/post/:id/comment', requireAuth, postController.addComment);

// Delete comment
router.delete('/post/:postId/comment/:commentId', requireAuth, postController.deleteComment);

// Edit comment
router.put('/post/:postId/comment/:commentId', requireAuth, postController.editComment);

module.exports = router;
