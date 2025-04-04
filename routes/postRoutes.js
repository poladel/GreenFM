const { Router } = require('express');
const postController = require('../controllers/postController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();

// Route to handle post creation
router.post('/post', requireAuth, postController.upload.fields([{ name: 'media', maxCount: 5 }, { name: 'video', maxCount: 1 }]), postController.createPost);

// Route to fetch all posts
router.get('/posts', postController.getAllPosts);

module.exports = router;
