const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { requireAuth } = require('../middleware/authMiddleware');
const ForumPost = require('../models/ForumPost');
const { Report } = require('../models/ForumPost'); // Import the Report model

// Forum post routes (API endpoints)
router.post('/posts', requireAuth, forumController.handleFileUploads, forumController.createPost); // File upload is handled here
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);
// Removed forumController.handleFileUploads from the PUT route
router.put('/posts/:id', requireAuth, forumController.updatePost); 
router.delete('/posts/:id', requireAuth, forumController.deletePost); // Use controller delete

// Like & Comment routes
router.post('/posts/:id/like', requireAuth, forumController.toggleLike);
router.post('/posts/:id/comment', requireAuth, forumController.addComment);
router.get('/posts/:id/comments', forumController.getComments);
router.delete('/posts/:id/comments/:commentId', requireAuth, forumController.deleteComment);

// Poll routes
router.post('/poll', requireAuth, forumController.createPoll);
router.post('/poll/vote', requireAuth, forumController.votePoll);
router.put('/poll/:postId', requireAuth, forumController.updatePoll);

// Edit comment route
router.put('/posts/:postId/comment/:commentId', requireAuth, forumController.updateComment); // Use controller updateComment

// Delete comment route
router.delete('/posts/:postId/comments/:commentId', requireAuth, forumController.deleteComment); // Use controller deleteComment

// Forum page route with pagination
router.get('/forum', /* Removed requireAuth for public view */ async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Keep limit consistent with frontend

    const totalPosts = await ForumPost.countDocuments({ isDeleted: { $ne: true } }); // Exclude deleted
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await ForumPost.find({ isDeleted: { $ne: true } }) // Exclude deleted
      .sort({ createdAt: -1 }) // Sort by creation date descending
      .populate('userId', 'username') // Populate username only if needed
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Use lean for performance if not modifying docs

    // Pass user data if logged in, otherwise null
    const user = req.user || null; 

    res.render('2-user/3-forum', {
      posts,
      user: user, // Pass user object (or null)
      pageTitle: 'Community Forum',
      cssFile: '/css/forum.css', // Ensure CSS path is correct
      currentPage: page,
      totalPages,
      headerTitle: 'FORUM', // Match header title used in EJS
      currentPath: req.path // Pass current path for login redirect
    });
  } catch (err) {
    console.error('Error loading forum page:', err);
    // Render error state or fallback
    res.status(500).render('error', { // Assuming an error.ejs view exists
        message: 'Could not load forum posts.',
        error: err,
        user: req.user || null,
        pageTitle: 'Error',
        headerTitle: 'Error'
    });
  }
});

module.exports = router;
