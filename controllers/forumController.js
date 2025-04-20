const ForumPost = require('../models/ForumPost');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier');

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
      resource_type: isVideo ? 'video' : 'image',
      format: isVideo ? 'mp4' : 'webp',
      quality: 'auto:good',
      ...(isVideo ? {} : { transformation: { width: 800, height: 800, crop: 'limit' } })
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          type: isVideo ? 'video' : 'image'
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

// Controller Methods
exports.createPost = async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!title?.trim() && !text?.trim() && !req.uploadedMedia?.length) {
      return res.status(400).json({
        success: false,
        error: 'Post must contain either title, text, or media'
      });
    }

    console.log('📌 req.user:', req.user); // Add this for debug
    console.log('📌 Uploaded media:', req.uploadedMedia); // Add this for debug

    const post = new ForumPost({
      title: title?.trim(),
      text: text?.trim(),
      userId: req.user._id,
      media: req.uploadedMedia,
      likes: [],
      comments: []
    });

    await post.save();

    const populatedPost = await ForumPost.populate(post, {
      path: 'userId',
      select: 'username profilePicture'
    });

    res.status(201).json({
      success: true,
      post: populatedPost.toObject()
    });
  } catch (error) {
    console.error('❌ Create post error:', error);  // Logs actual error in terminal
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      details: error.message  // Show real cause
    });
  }
};




exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userId = req.user ? req.user._id.toString() : null;

    const [posts, total] = await Promise.all([
      ForumPost.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username profilePicture')
        .populate('comments.userId', 'username profilePicture')
        .lean(),
      ForumPost.countDocuments({ isDeleted: { $ne: true } })
    ]);

    const updatedPosts = posts.map(post => ({
      ...post,
      liked: userId ? post.likes.some(id => id.toString() === userId) : false
    }));

    res.json({
      success: true,
      posts: updatedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
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

    res.json({ success: true, liked, likeCount: post.likes.length });
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
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({ success: true, comments: post.comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};
