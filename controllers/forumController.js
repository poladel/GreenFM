const ForumPost = require('../models/ForumPost');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const streamifier = require('streamifier');




cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration
const FILE_UPLOAD_LIMITS = {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 6
};

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime'
];

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: FILE_UPLOAD_LIMITS,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
}).any();


// Upload to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const isVideo = file.mimetype.startsWith('video/');
    const uploadOptions = {
      folder: 'uploads',
      resource_type: isVideo ? 'video' : 'image',  // Correct type assignment
      format: isVideo ? 'mp4' : 'webp',  // Correct format assignment
      quality: 'auto:good',
      ...(isVideo ? {} : { transformation: { width: 800, height: 800, crop: 'limit' } }) // Apply transformations for images only
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          type: isVideo ? 'video' : 'image'  // Ensure the type is correctly set
        });
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// Middleware
exports.handleFileUploads = (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) throw err instanceof multer.MulterError 
        ? new Error(`Upload error: ${err.message}`) 
        : err;

      const files = req.files || [];
      req.uploadedMedia = files.length > 0 
        ? await Promise.all(files.map(uploadToCloudinary))
        : [];

      next();
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process uploads',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};

// Controller Method

exports.createPost = async (req, res) => {
  try {
    const { title, text, pollQuestion, pollOptions } = req.body; // Get poll data from body
    let media = [];

    // Handle media uploads (images and videos)
    if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      media = req.uploadedMedia.map(file => ({
        url: file.url,
        type: file.type
      }));
    }

    const newPost = new ForumPost({
      userId: req.user._id,
      title,
      text,
      media,
      poll: pollQuestion ? {
        question: pollQuestion,
        options: pollOptions.map(opt => ({ text: opt }))  // Map poll options to an array
      } : null
    });

    await newPost.save();
    res.json({ success: true, post: newPost });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await ForumPost.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profilePicture')
      .lean();

    const totalPosts = await ForumPost.countDocuments({ isDeleted: { $ne: true } });

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('comments.userId', 'username profilePicture')
      .populate('likes', 'username profilePicture');

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { title, text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await ForumPost.findOne({
      _id: postId,
      userId,
      isDeleted: { $ne: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or unauthorized'
      });
    }

    post.title = title?.trim() || post.title;
    post.text = text?.trim() || post.text;
    post.media = req.uploadedMedia?.length ? req.uploadedMedia : post.media;
    post.updatedAt = new Date();

    await post.save();
    const populatedPost = await ForumPost.populate(post, {
      path: 'userId',
      select: 'username profilePicture'
    });

    res.json({
      success: true,
      post: populatedPost.toObject()
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await ForumPost.findOneAndUpdate(
      { _id: postId, userId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or unauthorized'
      });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};


exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user?._id || req.session?.userId || null;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const post = await ForumPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const likeIndex = post.likes.findIndex(id => id.toString() === userId.toString());
    const liked = likeIndex === -1;

    if (liked) {
      post.likes.push(userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    res.json({ success: true, likes: post.likes });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    const post = await ForumPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const newComment = {
      userId,
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    const populatedPost = await ForumPost.populate(post, {
      path: 'comments.userId',
      select: 'username profilePicture'
    });

    const addedComment = populatedPost.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      comment: addedComment.toObject(),
      commentCount: post.comments.length
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

exports.getComments = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .select('comments')
      .populate('comments.userId', 'username profilePicture')
      .lean();

    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const visibleComments = post.comments.filter(c => !c.isDeleted); // ✅ Hide deleted comments

    res.json({ success: true, comments: visibleComments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
};


exports.updateComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment || comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    comment.text = text;
    await post.save();

    res.json({ success: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update comment' });
  }
};

exports.deleteComment = async (req, res) => {
  const { id: postId, commentId } = req.params;

  try {
    const post = await ForumPost.findOneAndUpdate(
      { _id: postId, "comments._id": commentId },
      { $set: { "comments.$.isDeleted": true } }, // Soft-delete
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in deleteComment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a poll
exports.createPoll = async (req, res) => {
  const { question, options } = req.body;
  try {
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid poll' });
    }

    const newPost = new ForumPost({
      userId: req.user._id,
      poll: {
        question,
        options: options.map(opt => ({ text: opt.trim(), votes: [] }))
      }
    });

    await newPost.save();
    res.redirect('/forum'); // or respond with JSON
  } catch (err) {
    console.error('Poll creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.votePoll = async (req, res) => {
  const { postId, optionIndex } = req.body;
  const userId = req.user._id;

  try {
    const post = await ForumPost.findById(postId);
    if (!post || !post.poll) return res.status(404).json({ success: false });

    // Check if the user has already voted
    const alreadyVoted = post.poll.options.some(opt => opt.votes.includes(userId));
    if (alreadyVoted) return res.status(400).json({ success: false, message: 'You have already voted' });

    // Add vote to the selected option
    post.poll.options[optionIndex].votes.push(userId);
    await post.save();

    // Return the updated poll object with the vote count
    res.json({
      success: true,
      poll: post.poll // Send the updated poll with the new vote count
    });
  } catch (error) {
    console.error('Error voting for poll:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Update Poll (question and options)
exports.updatePoll = async (req, res) => {
  const { postId } = req.params;
  const { question, options } = req.body;
  const userId = req.user._id;

  try {
    const post = await ForumPost.findById(postId);
    if (!post || post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this poll' });
    }

    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Poll must have a question and at least 2 options' });
    }

    post.poll.question = question;
    post.poll.options = options.map(opt => ({ text: opt.trim(), votes: [] }));

    await post.save();
    res.json({ success: true, poll: post.poll });
  } catch (error) {
    console.error('Update poll error:', error);
    res.status(500).json({ success: false, message: 'Failed to update poll' });
  }
};