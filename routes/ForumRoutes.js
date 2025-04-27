const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { requireAuth } = require('../middleware/authMiddleware');
const ForumPost = require('../models/ForumPost');
const { Report } = require('../models/ForumPost'); // Import the Report model

// Forum post routes (API endpoints)
router.post('/posts', requireAuth, forumController.handleFileUploads, forumController.createPost);
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);
router.put('/posts/:id', requireAuth, forumController.handleFileUploads, forumController.updatePost);
router.delete('/posts/:id', requireAuth, forumController.deletePost);

// Like & Comment routes
router.post('/posts/:id/like', requireAuth, forumController.toggleLike);
router.post('/posts/:id/comment', requireAuth, forumController.addComment);
router.get('/posts/:id/comments', forumController.getComments);
router.delete('/posts/:id/comments/:commentId', requireAuth, forumController.deleteComment);

// Poll routes
router.post('/poll', requireAuth, forumController.createPoll);
router.post('/poll/vote', requireAuth, forumController.votePoll); // Handle poll vote submissions
router.put('/poll/:postId', requireAuth, forumController.updatePoll);

// Edit comment
router.put('/posts/:postId/comment/:commentId', requireAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;

    const post = await ForumPost.findById(postId);
    if (!post) return res.status(404).json({ success: false });

    const comment = post.comments.id(commentId);
    if (!comment || comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false });
    }

    comment.text = text;
    await post.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// Delete comment
router.delete('/posts/:postId/comments/:commentId', requireAuth, async (req, res) => {
  const { postId, commentId } = req.params;

  try {
    const post = await ForumPost.findById(postId);
    const comment = post.comments.id(commentId);

    if (!comment || comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    comment.remove();
    await post.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Report post route
router.post('/posts/report', requireAuth, async (req, res) => {
  const { type, targetId } = req.body;

  // Ensure the report type is either 'post' or 'comment'
  if (!['post', 'comment'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid report type' });
  }

  try {
    const report = new Report({
      type,
      targetId,
      reporterId: req.user._id,
      reason: 'Inappropriate content' // Default reason can be customized later
    });

    await report.save();

    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to report' });
  }
});

// Report comment route
router.post('/posts/:postId/comments/:commentId/report', requireAuth, async (req, res) => {
  const { postId, commentId } = req.params;

  try {
    const report = new Report({
      type: 'comment',
      targetId: commentId,
      reporterId: req.user._id,
      reason: 'Inappropriate content' // Default reason can be customized later
    });

    await report.save();
    res.json({ success: true, message: 'Comment reported successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to report comment' });
  }
});

// Forum page route with pagination
router.get('/forum', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const totalPosts = await ForumPost.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await ForumPost.find()
      .populate('userId')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.render('2-user/3-forum', {
      posts,
      user: req.user,
      pageTitle: 'Community Forum',
      cssFile: '/css/forum.css',
      currentPage: page,
      totalPages,
      headerTitle: 'Forum Feed'
    });
  } catch (err) {
    console.error('Error loading forum page:', err);
    res.render('2-user/3-forum', {
      posts: [],
      user: req.user,
      pageTitle: 'Community Forum',
      cssFile: '/css/forum.css',
      currentPage: 1,
      totalPages: 1,
      headerTitle: 'Forum Feed'
    });
  }
});

// Extra authorization-checked delete route
router.delete('/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id; // assuming authentication middleware sets this

    const post = await ForumPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    await ForumPost.findByIdAndDelete(postId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Extra authorization-checked update route
router.put('/posts/:id', async (req, res) => {
  const { title, text, edited } = req.body;

  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false });
    }

    post.title = title;
    post.text = text;
    if (edited) {
      post.edited = true;
      post.editedAt = Date.now();
    }

    await post.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Poll vote route (this handles poll voting)
router.post('/poll/vote', requireAuth, async (req, res) => {
  const { postId, optionIndex } = req.body;

  try {
    const post = await ForumPost.findById(postId);
    if (!post || !post.poll) return res.status(400).json({ success: false, message: 'Poll not found' });

    // Check if the user has already voted
    const userHasVoted = post.poll.options[optionIndex].votes.includes(req.user._id);
    if (userHasVoted) return res.status(400).json({ success: false, message: 'You have already voted' });

    // Add the user's vote
    post.poll.options[optionIndex].votes.push(req.user._id);

    await post.save();
    res.json({ success: true, message: 'Vote submitted' });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ success: false, message: 'Error voting on poll' });
  }
});

module.exports = router;