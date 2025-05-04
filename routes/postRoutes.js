const { Router } = require('express');
const postController = require('../controllers/postController');
const { requireAuth } = require('../middleware/authMiddleware');
const multer = require('multer'); // Import multer

const router = Router();

// --- Define the upload middleware ---
const uploadMiddleware = postController.upload.fields([
    { name: 'media', maxCount: 6 },
    { name: 'video', maxCount: 1 }
]);

// --- Apply middleware and add specific error handling for this route ---
router.post(
    '/post',
    requireAuth,
    (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                console.error('Multer Error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: `File too large. Maximum size is 20MB.` });
                }
                // --- ADD THIS CHECK ---
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    // Check which field exceeded the limit
                    if (err.field === 'media') {
                        return res.status(400).json({ error: `Too many images uploaded. Maximum is 6.` });
                    } else if (err.field === 'video') {
                        return res.status(400).json({ error: `Too many videos uploaded. Maximum is 1.` });
                    } else {
                        return res.status(400).json({ error: `Too many files uploaded for field: ${err.field}` });
                    }
                }
                // --- END ADDED CHECK ---
                // Handle other potential Multer errors
                return res.status(400).json({ error: `File upload error: ${err.message}` });
            } else if (err) {
                // An unknown error occurred when uploading.
                console.error('Unknown Upload Error:', err);
                return res.status(500).json({ error: `An unexpected error occurred during upload: ${err.message}` });
            }
            // If no error, proceed to the controller
            next();
        });
    },
    postController.createPost // Controller function
);

// Filtered post list (used for rendering with search/filtering)
router.get('/posts-filter', postController.getFilteredPosts);

// API route to get JSON (for admin/API use maybe?)
router.get('/api/posts', postController.getAllPosts);

router.put('/post/:id', requireAuth, postController.updatePost);
router.delete('/post/:id', requireAuth, postController.deletePost);
router.post('/post/:id/like', requireAuth, postController.toggleLike);
router.post('/post/:id/comment', requireAuth, postController.addComment);
router.delete('/post/:postId/comment/:commentId', requireAuth, postController.deleteComment);
router.put('/post/:postId/comment/:commentId', requireAuth, postController.editComment);

module.exports = router;
