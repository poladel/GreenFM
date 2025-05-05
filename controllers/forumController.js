//forumController
const ForumPost = require('../models/ForumPost');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const streamifier = require('streamifier');
const sendEmail = require('../config/mailer'); // Import sendEmail

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
  'video/quicktime',
  'image/gif' // <<< Add image/gif
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
      // --- Fix incomplete error handling ---
      if (err) {
        // Log the specific multer error
        console.error('[Multer Error]', err);
        // Re-throw multer errors or other upload errors to be caught below
        throw err instanceof multer.MulterError
          ? new Error(`Upload error: ${err.message} (Field: ${err.field || 'N/A'})`) // Add field info
          : err;
      }
      // --- End fix ---

      const files = req.files || [];
      console.log('[handleFileUploads] Files received by multer:', files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype, size: f.size }))); // Log file details

      req.uploadedMedia = files.length > 0
        ? await Promise.all(files.map(uploadToCloudinary))
        : [];

      console.log('[handleFileUploads] Uploaded media to Cloudinary:', req.uploadedMedia); // Log Cloudinary results

      next();
    } catch (error) {
      console.error('Upload processing error:', error);
      // Send specific error message if available, otherwise generic
      const errorMessage = error instanceof Error ? error.message : 'Failed to process uploads';
      res.status(500).json({
        success: false,
        error: errorMessage, // Use the specific error message
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined // Include stack in dev
      });
    }
  });
};

// Controller Method

exports.createPost = async (req, res) => {
  const io = req.io; // Use req.io attached by middleware
  try {
    // --- Add Logging for received body and files ---
    console.log('[createPost] Request Body:', req.body);
    console.log('[createPost] Uploaded Media (from middleware):', req.uploadedMedia);
    // --- End Logging ---

    const { title, text, pollQuestion, pollOptions } = req.body; // Get poll data from body
    let media = [];

    // Handle media uploads (images and videos)
    if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      media = req.uploadedMedia.map(file => ({
        url: file.url,
        type: file.type
      }));
    }

    // --- Add Check for Title ---
    if (!title || title.trim() === '') {
        console.error('[createPost] Error: Title is missing or empty in request body.');
        return res.status(400).json({ success: false, error: 'Post title is required.' });
    }
    // --- End Check ---


    const newPost = new ForumPost({
      userId: req.user._id,
      title: title.trim(), // Trim title here as well
      text,
      media,
      poll: pollQuestion ? {
        question: pollQuestion,
        options: pollOptions.map(opt => ({ text: opt }))  // Map poll options to an array
      } : null
    });

    await newPost.save();

    // --- Populate user details before emitting ---
    const populatedPost = await ForumPost.populate(newPost, {
      path: 'userId',
      select: 'username profilePicture'
    });
    // --- End Populate ---

    // --- Emit socket event ---
    if (io) { // Check if io exists before emitting
        io.emit('newPost', populatedPost.toObject()); // Emit the populated post
        console.log(`[Socket Emit] Emitted newPost: ${populatedPost._id}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit newPost event.');
    }
    // --- End Emit ---

    // Respond with populated post as well
    res.status(201).json({ success: true, post: populatedPost.toObject() });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Match frontend limit
    const skip = (page - 1) * limit;

    const posts = await ForumPost.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profilePicture')
      // --- Select reports.userId to send to frontend ---
      // Explicitly select fields needed, including reports.userId
      .select('title text userId media likes poll reports.userId createdAt updatedAt edited isDeleted')
      // --- End Select ---
      .lean(); // Use lean for performance

    const totalPosts = await ForumPost.countDocuments({ isDeleted: { $ne: true } });

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error fetching posts:', err); // Log error
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('comments.userId', 'username profilePicture')
      .populate('likes', 'username profilePicture')
      // --- Select reports.userId here too ---
      .select('title text userId media likes poll reports comments createdAt updatedAt edited isDeleted') // Ensure reports.userId is included if needed
      // --- End Select ---
      // Removed .lean() here because we modify the object below

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Filter out deleted comments before sending
    const postObject = post.toObject(); // Convert to plain object
    if (postObject.comments) {
        postObject.comments = postObject.comments.filter(c => !c.isDeleted);
    }


    res.json({
      success: true,
      post: postObject // Send the modified object
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
  const io = req.io; // Use req.io
  try {
    const { title, text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;
    const userRoles = req.user.roles || []; // Get user roles

    // Find the post first
    const post = await ForumPost.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check permissions: Owner OR Admin/Staff
    const isOwner = post.userId.toString() === userId.toString();
    const isAdminOrStaff = userRoles.includes('Admin') || userRoles.includes('Staff');

    if (!isOwner && !isAdminOrStaff) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this post' });
    }

    // --- Add Check: Prevent title/text edit if poll has votes ---
    if (post.poll && post.poll.options && post.poll.options.some(opt => opt.votes && opt.votes.length > 0)) {
        // Allow Admins/Staff to edit even if votes exist? (Optional - uncomment if needed)
        // if (!isAdminOrStaff) {
            console.log(`[Update Post] Attempt blocked: Post ${postId} has a poll with votes.`);
            return res.status(400).json({ success: false, error: 'Cannot edit title when votes exist.' });
        // }
    }
    // --- End Check ---


    // Update fields if provided
    if (title !== undefined) post.title = title.trim();
    if (text !== undefined) post.text = text.trim(); // Allow empty text

    // Note: Media is NOT updated here as per current frontend logic
    // If media update is needed later, handleFileUploads would need to be added back
    // conditionally or a separate route created.

    post.updatedAt = new Date();
    post.edited = true; // Mark as edited

    await post.save();

    // Populate user details for the response and emit
    const populatedPost = await ForumPost.populate(post, {
      path: 'userId',
      select: 'username profilePicture' // Adjust fields as needed
    });

    // --- Emit socket event ---
    if (io) { // Check io
        // Emit the fully populated post object
        io.emit('postUpdated', populatedPost.toObject());
        console.log(`[Socket Emit] Emitted postUpdated: ${populatedPost._id}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit postUpdated event.');
    }
    // --- End Emit ---

    res.json({
      success: true,
      post: populatedPost.toObject() // Send back the updated post object
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
  const io = req.io; // Use req.io
  const postId = req.params.id; // Get postId early
  try {
    const userId = req.user._id;
    const userRoles = req.user.roles || []; // Get user roles

    // Find the post first
    const post = await ForumPost.findById(postId);

    if (!post || post.isDeleted) { // Check if already soft-deleted
        return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check permissions: Owner OR Admin/Staff
    const isOwner = post.userId.toString() === userId.toString();
    const isAdminOrStaff = userRoles.includes('Admin') || userRoles.includes('Staff');

    if (!isOwner && !isAdminOrStaff) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    // Perform soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    // --- Emit socket event ---
    if (io) { // Check io
        io.emit('postDeleted', { postId });
        console.log(`[Socket Emit] Emitted postDeleted: ${postId}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit postDeleted event.');
    }
    // --- End Emit ---

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
  const io = req.io; // Use req.io
  const postId = req.params.id; // Get postId early
  try {
    const userId = req.user?._id; 

    if (!userId) {
      // This case might not be reached if requireAuth works correctly, but good practice
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const post = await ForumPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const userIdString = userId.toString();
    const likeIndex = post.likes.findIndex(id => id.toString() === userIdString);
    
    if (likeIndex === -1) {
      // User hasn't liked yet, add like
      post.likes.push(userId);
    } else {
      // User has liked, remove like
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    // --- Emit socket event ---
    if (io) { // Check io
        io.emit('postLiked', { postId, likes: post.likes });
        console.log(`[Socket Emit] Emitted postLiked: ${postId}, Likes: ${post.likes.length}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit postLiked event.');
    }
    // --- End Emit ---

    // Return the updated array of likes
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
  const io = req.io; // Use req.io
  const postId = req.params.id; // Get postId early
  try {
    const { text } = req.body;
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

    // Populate the newly added comment with user details
    const populatedPost = await ForumPost.populate(post, {
      path: 'comments.userId',
      select: 'username profilePicture'
    });

    const addedComment = populatedPost.comments[post.comments.length - 1];

    // --- Emit socket event ---
    if (io) { // Check io
        io.emit('newComment', { postId, comment: addedComment.toObject() });
        console.log(`[Socket Emit] Emitted newComment for post ${postId}, comment ${addedComment._id}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit newComment event.');
    }
    // --- End Emit ---

    res.status(201).json({
      success: true,
      comment: addedComment.toObject(),
      commentCount: post.comments.length // Keep sending count in response if needed
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
  const io = req.io; // Use req.io

  // --- Add Detailed Logging ---
  console.log(`[Update Comment] Received request for Post ID: ${postId}, Comment ID: ${commentId}`);
  // --- End Logging ---

  try {
    const post = await ForumPost.findById(postId);
    if (!post || post.isDeleted) { // Check if post exists and is not deleted
        // --- Add Logging ---
        console.log(`[Update Comment] Post not found or deleted for ID: ${postId}`);
        // --- End Logging ---
        return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // --- Add Logging ---
    console.log(`[Update Comment] Found post. Attempting to find comment ID: ${commentId} within post.`);
    // --- End Logging ---
    const comment = post.comments.id(commentId);

    // --- Explicitly check if comment exists ---
    if (!comment || comment.isDeleted) { // Also check if comment is soft-deleted
      // --- Add Logging ---
      console.log(`[Update Comment] Comment not found or deleted for ID: ${commentId} in post ${postId}. Comment object:`, comment);
      // --- End Logging ---
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    // --- End Check ---

    // --- Add Logging ---
    console.log(`[Update Comment] Found comment. Checking authorization. Comment User ID: ${comment.userId}, Request User ID: ${userId}`);
    // --- End Logging ---

    // --- Check authorization (ownership) ---
    if (comment.userId.toString() !== userId.toString()) {
      // --- Add Logging ---
      console.log(`[Update Comment] Authorization failed for user ${userId} on comment ${commentId}.`);
      // --- End Logging ---
      return res.status(403).json({ success: false, error: 'Unauthorized to update this comment' });
    }
    // --- End Check ---

    // --- Validate input ---
    if (text === undefined || text === null || text.trim() === '') { // Also check for empty trimmed text
        // --- Add Logging ---
        console.log(`[Update Comment] Validation failed: Comment text is missing or empty.`);
        // --- End Logging ---
        return res.status(400).json({ success: false, error: 'Comment text cannot be empty' });
    }
    // --- End Validation ---

    // --- Add Logging ---
    console.log(`[Update Comment] Authorization and validation passed. Updating comment text.`);
    // --- End Logging ---

    comment.text = text.trim(); // Trim the text
    comment.edited = true; // Mark as edited
    comment.updatedAt = new Date(); // Update timestamp
    await post.save();

    // --- Populate comment user details before emitting ---
     const populatedPost = await ForumPost.populate(post, {
       path: 'comments.userId',
       select: 'username profilePicture'
     });
     const updatedComment = populatedPost.comments.id(commentId);
    // --- End Populate ---

    // --- Emit socket event ---
    if (io) { // Check io
        // Emit the populated comment object
        io.emit('commentUpdated', { postId, comment: updatedComment.toObject() });
        console.log(`[Socket Emit] Emitted commentUpdated for post ${postId}, comment ${commentId}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit commentUpdated event.');
    }
    // --- End Emit ---

    res.json({ success: true, comment: updatedComment.toObject() });
  } catch (err) {
    console.error('Update comment error:', err); // Log the full error
    res.status(500).json({ success: false, error: 'Failed to update comment' });
  }
};

exports.deleteComment = async (req, res) => {
  const { id: postId, commentId } = req.params;
  const userId = req.user._id;
  const userRoles = req.user.roles || [];
  const io = req.io; // Use req.io

  try {
    const post = await ForumPost.findById(postId);
    if (!post || post.isDeleted) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment || comment.isDeleted) { // Check if comment exists and isn't already deleted
        return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check permissions: Comment Owner OR Admin/Staff
    const isOwner = comment.userId.toString() === userId.toString();
    const isAdminOrStaff = userRoles.includes('Admin') || userRoles.includes('Staff');

    if (!isOwner && !isAdminOrStaff) { // Allow if owner OR admin/staff
        return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Perform soft delete on the subdocument
    comment.isDeleted = true;
    comment.deletedAt = new Date(); // Add deleted timestamp
    await post.save(); // Save the parent document

    // --- Emit socket event (already implemented in previous step) ---
    if (io) { // Check io
        io.emit('commentDeleted', { postId, commentId });
        console.log(`[Socket Emit] Emitted commentDeleted for post ${postId}, comment ${commentId}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit commentDeleted event.');
    }
    // --- End Emit ---

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteComment:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting comment' });
  }
};

// Create a poll
// Create Poll
exports.createPoll = async (req, res) => {
  const { question, options } = req.body;
  const io = req.io; // Get io instance

  try {
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid poll data: Question and at least 2 options required.' });
    }

    // --- Create the post with poll data ---
    const newPost = new ForumPost({
      userId: req.user._id,
      // Add a default title or make it optional in the model if polls don't need titles
      title: question.substring(0, 50) + (question.length > 50 ? '...' : ''), // Example: Use question start as title
      text: '', // Polls might not have separate text
      poll: {
        question: question.trim(), // Trim question
        options: options
          .map(opt => ({ text: opt.trim(), votes: [] })) // Trim options
          .filter(opt => opt.text) // Filter out empty options after trimming
      }
    });

    // --- Validate again after trimming/filtering options ---
    if (newPost.poll.options.length < 2) {
        return res.status(400).json({ success: false, message: 'Invalid poll data: At least 2 non-empty options required.' });
    }
    // --- End Validation ---


    await newPost.save();

    // --- Populate user details before emitting/responding ---
    const populatedPost = await ForumPost.populate(newPost, {
      path: 'userId',
      select: 'username profilePicture' // Select fields needed by frontend
    });
    // --- End Populate ---

    // --- Emit socket event ---
    if (io) {
        io.emit('newPost', populatedPost.toObject()); // Emit the full post object
        console.log(`[Socket Emit] Emitted newPost (Poll): ${populatedPost._id}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit newPost event for poll.');
    }
    // --- End Emit ---

    // --- Respond with the created post object ---
    res.status(201).json({ success: true, post: populatedPost.toObject() });
    // --- End Response ---

  } catch (err) {
    console.error('Poll creation error:', err);
    res.status(500).json({ success: false, message: 'Error creating poll' });
  }
};



exports.votePoll = async (req, res) => {
  const { postId, optionIndex } = req.body;
  const userId = req.user._id;
  const io = req.io; // Use req.io attached by middleware

  try {
    const post = await ForumPost.findById(postId);
    if (!post || !post.poll) return res.status(404).json({ success: false });

    // Check if the user has already voted
    const alreadyVoted = post.poll.options.some(opt => opt.votes.includes(userId));
    if (alreadyVoted) return res.status(400).json({ success: false, message: 'You have already voted' });

    // Add vote to the selected option
    post.poll.options[optionIndex].votes.push(userId);
    await post.save();

    // --- Emit socket event ---
    if (io) { // Check io
        io.emit('pollVoted', { postId, poll: post.poll }); // Send updated poll data
        console.log(`[Socket Emit] Emitted pollVoted for post ${postId}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit pollVoted event.');
    }
    // --- End Emit ---

    // Return the updated poll object
    res.json({
      success: true,
      poll: post.poll
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
  const io = req.io; // Use req.io

  try {
    const post = await ForumPost.findById(postId);
    // --- Check Post Existence and Ownership ---
    if (!post || post.isDeleted) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!post.poll) {
        return res.status(400).json({ success: false, message: 'This post does not contain a poll' });
    }
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this poll' });
    }
    // --- End Checks ---

    // --- Check for Existing Votes ---
    const hasVotes = post.poll.options.some(opt => opt.votes && opt.votes.length > 0);
    if (hasVotes) {
        return res.status(400).json({ success: false, message: 'Cannot edit a poll that already has votes' });
    }
    // --- End Check for Votes ---

    // --- Validate Input ---
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Poll must have a question and at least 2 options' });
    }
    const trimmedOptions = options.map(opt => ({ text: opt.trim(), votes: [] })).filter(opt => opt.text);
    if (trimmedOptions.length < 2) {
        return res.status(400).json({ success: false, message: 'Poll must have at least 2 non-empty options' });
    }
    // --- End Validation ---

    // --- Update Poll Data ---
    post.poll.question = question.trim();
    post.poll.options = trimmedOptions; // Use the validated and trimmed options
    post.edited = true; // Mark the post as edited
    post.updatedAt = new Date();
    // --- End Update ---

    await post.save();

    // --- Emit Socket Event ---
    if (io) {
        // Send the updated poll subdocument along with the postId
        io.emit('pollUpdated', { postId, poll: post.poll }); // <<< NOTE: Ensure client handles 'pollUpdated' event
        console.log(`[Socket Emit] Emitted pollUpdated for post ${postId}`);
    } else {
        console.warn('[Socket Emit] req.io not found. Cannot emit pollUpdated event.');
    }
    // --- End Emit ---

    res.json({ success: true, poll: post.poll });
  } catch (error) {
    console.error('Update poll error:', error);
    res.status(500).json({ success: false, message: 'Failed to update poll' });
  }
};

// --- Update Report Post Functionality ---
exports.reportPost = async (req, res) => {
    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id; // Assuming requireAuth middleware adds user to req

    try {
        // --- Fetch post *without* lean() to use .save() ---
        const post = await ForumPost.findById(postId);
        // --- End Fetch ---
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Safeguard: Ensure post.reports is an array (already added in schema with default)
        if (!Array.isArray(post.reports)) {
             console.warn(`[Report Post] Post ${postId} 'reports' field is not an array. Initializing.`);
             post.reports = [];
        }


        // Check if user has already reported this post
        const existingReport = post.reports.find(report => report.userId.toString() === userId.toString());
        if (existingReport) {
            return res.status(400).json({ success: false, error: 'You have already reported this post' });
        }

        // Add report details to the post
        const reportDetails = {
            userId: userId,
            reason: reason || 'No reason provided',
            // reportedAt is set by default in schema
        };
        post.reports.push(reportDetails);
        await post.save(); // Save the updated post document

        // --- Send Email Notification using sendEmail ---
        if (process.env.ADMIN_EMAIL) {
            try {
                const subject = `Forum Post Reported: ${postId}`;
                const htmlContent = `<p>A forum post has been reported.</p>
                           <p><strong>Post ID:</strong> ${postId}</p>
                           <p><strong>Reported by User ID:</strong> ${userId} (Username: ${req.user.username || 'N/A'})</p>
                           <p><strong>Reason:</strong> ${reportDetails.reason}</p>
                           <p><strong>Reported At:</strong> ${new Date().toISOString()}</p> <!-- Use current date for email -->
                           <p><a href="${req.protocol}://${req.get('host')}/forum#post-${postId}">View Post</a></p>`;

                await sendEmail(process.env.ADMIN_EMAIL, subject, htmlContent);
                console.log(`[Mailer] Report email sent successfully via sendEmail to ${process.env.ADMIN_EMAIL} for post ${postId}`);
            } catch (emailError) {
                console.error(`[Mailer] Failed to send report email via sendEmail for post ${postId}:`, emailError);
            }
        } else {
            console.warn(`[Mailer] ADMIN_EMAIL not set. Skipping report email for post ${postId}.`);
        }
        // --- End Send Email Notification ---

        res.json({ success: true, message: 'Post reported successfully' });

    } catch (error) {
        console.error('Error reporting post:', error);
        res.status(500).json({ success: false, error: 'Failed to report post' });
    }
};
// --- End Report Post Functionality ---