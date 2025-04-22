const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { requireAuth } = require('../middleware/authMiddleware');
const ForumPost = require('../models/ForumPost');

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

// Edit comment
// PUT /posts/:postId/comment/:commentId
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



module.exports = router;
