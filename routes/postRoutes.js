const { Router } = require('express');
const postController = require('../controllers/postController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();

router.post(
    '/post',
    requireAuth,
    postController.upload.fields([
        { name: 'media', maxCount: 6 },
        { name: 'video', maxCount: 1 }
    ]),
    postController.createPost
);

// Filtered post list (used for rendering with search/filtering)
router.get('/posts', postController.getFilteredPosts);

// API route to get JSON (for admin/API use maybe?)
router.get('/api/posts', postController.getAllPosts);

router.put('/post/:id', requireAuth, postController.updatePost);
router.delete('/post/:id', requireAuth, postController.deletePost);
router.post('/post/:id/like', requireAuth, postController.toggleLike);
router.post('/post/:id/comment', requireAuth, postController.addComment);
router.delete('/post/:postId/comment/:commentId', requireAuth, postController.deleteComment);
router.put('/post/:postId/comment/:commentId', requireAuth, postController.editComment);

module.exports = router;
