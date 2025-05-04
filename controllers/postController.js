const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const Post = require('../models/Post');
const User = require('../models/User'); // Import User model

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine resource type based on MIME type
        let resourceType = 'auto';
        if (file.mimetype.startsWith('image')) {
            resourceType = 'image';
        } else if (file.mimetype.startsWith('video')) {
            resourceType = 'video';
        }
        // Add more types if needed, e.g., 'raw' for other files

        return {
            folder: 'uploads',
            // format: file.mimetype.split('/')[1], // <<< REMOVE THIS LINE >>> Let Cloudinary auto-detect format
            resource_type: resourceType // Use determined resource type
        };
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Handle post creation
const createPost = async (req, res) => {
    try {
        console.log('🟢 Received POST request:', req.body);
        console.log('🟢 Uploaded files:', req.files);

        const { title, text } = req.body;
        if (!title || !text) {
            console.error("🔴 Missing title or text:", { title, text });
            return res.status(400).json({ error: "Title and content are required." });
        }

        // Extract multiple images
        const images = req.files['media'] ? req.files['media'].map(file => file.path) : [];

        // Extract video (if available)
        const video = req.files['video'] ? req.files['video'][0].path : null;

        let post = new Post({ // Use let instead of const
            userId: req.user._id,
            title: title.trim(),
            text: text.trim(),
            media: images,  // Store as an array
            video: video
        });

        await post.save();
        console.log("🟢 Post saved successfully (pre-population):", post);

        // Populate the userId field to get user details (like username)
        post = await Post.findById(post._id).populate('userId', 'username profilePicture'); // Populate necessary fields

        if (!post) {
             console.error("🔴 Failed to re-fetch and populate post after saving.");
             // Still return success as the post was saved, but log the error.
             // Client might get the update slightly delayed if another fetch happens.
             return res.json({ success: true, message: "Post created but population failed." });
        }

        console.log("🟢 Post populated:", post);

        // --- Emit the new post via Socket.IO ---
        if (req.io) {
            console.log("🟢 Emitting 'new_post' event via Socket.IO");
            req.io.emit('new_post', post.toObject()); // Emit the populated post data as a plain object
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'new_post' event.");
        }
        // --- End Socket.IO emit ---

        // Respond immediately, client will update via socket
        res.json({ success: true, message: "Post submitted successfully." }); // Changed response

    } catch (err) {
        // --- Enhanced Error Logging ---
        console.error('🔴 Error in createPost controller:', err); // Log the full error object
        console.error('🔴 Error Stack:', err.stack); // Log the stack trace
        // --- End Enhanced Error Logging ---
        res.status(500).json({ error: `Failed to create post: ${err.message}` });
    }
};

// Fetch all posts
const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate('userId', 'username').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};

// Update a post
const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, text } = req.body;
        const user = req.user; // Get current user

        console.log('Received data in backend:');
        console.log('Title:', title);  // Log title
        console.log('Text:', text);    // Log text

        if (!title || !text) {
            return res.status(400).json({ error: 'Title and text are required to update a post.' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // --- Authorization Check ---
        const isAdminOrStaff = Array.isArray(user.roles) ? user.roles.includes('Admin') || user.roles.includes('Staff') : user.roles === 'Admin' || user.roles === 'Staff';
        if (!post.userId.equals(user._id) && !isAdminOrStaff) {
             return res.status(403).json({ error: 'Unauthorized to edit this post.' });
        }
        // --- End Authorization Check ---

        post.title = title.trim();
        post.text = text.trim();

        await post.save();

        // --- Emit post edited event via Socket.IO ---
        if (req.io) {
            console.log(`🟢 Emitting 'post_edited' for post ${postId}`);
            req.io.emit('post_edited', {
                postId: postId,
                title: post.title,
                text: post.text
            });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'post_edited' event.");
        }
        // --- End Socket.IO emit ---

        res.json({ success: true, post }); // Respond success
    } catch (err) {
        console.error('🔴 Error updating post:', err);
        res.status(500).json({ error: `Failed to update post: ${err.message}` });
    }
};

// Utility function to extract public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
    const segments = url.split('/');
    const fileName = segments[segments.length - 1];
    const publicId = fileName.split('.')[0];  // Extract ID
    return publicId;
}

// Delete a post
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // --- Authorization Check (Example: Only owner or Admin can delete) ---
        const user = req.user; // Assuming req.user is populated by auth middleware
        const isAdmin = Array.isArray(user.roles) ? user.roles.includes('Admin') : user.roles === 'Admin';
        if (!post.userId.equals(user._id) && !isAdmin) {
             return res.status(403).json({ error: 'Unauthorized to delete this post.' });
        }
        // --- End Authorization Check ---


        // Delete associated media from Cloudinary
        for (let mediaUrl of post.media) {
            const publicId = getPublicIdFromUrl(mediaUrl);
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }); // Specify resource type if known
            console.log(`Cloudinary delete result for image ${publicId}: success`);
        }
        if (post.video) {
            const publicId = getPublicIdFromUrl(post.video);
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
             console.log(`Cloudinary delete result for video ${publicId}: success`);
        }


        // Now, delete the post from the database
        await Post.deleteOne({ _id: postId });

        // --- Emit post deleted event via Socket.IO ---
        if (req.io) {
            console.log(`🟢 Emitting 'post_deleted' for post ${postId}`);
            req.io.emit('post_deleted', { postId: postId });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'post_deleted' event.");
        }
        // --- End Socket.IO emit ---

        res.json({ success: true, message: 'Post and associated media deleted successfully' });
    } catch (err) {
        console.error('🔴 Error deleting post:', err);
        // More specific error handling for Cloudinary?
        if (err.http_code === 404) {
             console.warn(`Cloudinary resource not found during deletion (post ID: ${req.params.id}). Proceeding with DB deletion.`);
             // If DB deletion hasn't happened yet, ensure it does
             try {
                 await Post.deleteOne({ _id: req.params.id });
                 // Emit socket event even if Cloudinary failed partially
                 if (req.io) req.io.emit('post_deleted', { postId: req.params.id });
                 return res.json({ success: true, message: 'Post deleted, but some Cloudinary media might remain.' });
             } catch (dbErr) {
                 console.error('🔴 Error deleting post from DB after Cloudinary error:', dbErr);
                 return res.status(500).json({ error: `Failed to delete post after Cloudinary error: ${dbErr.message}` });
             }
        }
        res.status(500).json({ error: `Failed to delete post: ${err.message}` });
    }
};

const toggleLike = async (req, res) => {
    const postId = req.params.id;
    const userId = req.user._id;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const hasLiked = post.likes.includes(userId);

        if (hasLiked) {
            post.likes.pull(userId); // Remove like
        } else {
            post.likes.push(userId); // Add like
        }

        await post.save();

        const likeCount = post.likes.length;
        const liked = !hasLiked;

        // --- Emit like update via Socket.IO ---
        if (req.io) {
            console.log(`🟢 Emitting 'post_like_update' for post ${postId}`);
            req.io.emit('post_like_update', { postId: postId, likeCount: likeCount, userId: userId, liked: liked });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'post_like_update' event.");
        }
        // --- End Socket.IO emit ---

        res.json({ success: true, liked: liked, likeCount: likeCount });
    } catch (err) {
        console.error('Error toggling like:', err); // Added error logging
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};

const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Comment text is required.' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        // Fetch user details to include profile picture
        const user = await User.findById(req.user._id).select('username profilePicture');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }


        const comment = {
            userId: req.user._id,
            username: user.username,
            profilePicture: user.profilePicture, // Add profile picture
            text
        };

        post.comments.push(comment);
        await post.save();

        // --- Emit new comment via Socket.IO ---
        const newCommentData = post.comments[post.comments.length - 1]; // Get the newly added comment
        if (req.io) {
            console.log(`🟢 Emitting 'new_comment' for post ${postId}`);
            // Emit to a room specific to the post? Or broadcast? Broadcasting for now.
            req.io.emit('new_comment', { postId: postId, comment: newCommentData.toObject() });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'new_comment' event.");
        }
        // --- End Socket.IO emit ---


        // Respond with the comment data including the generated _id
        res.status(200).json({ success: true, comment: newCommentData.toObject() });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Failed to add comment.' });
    }
};

const deleteComment = async (req, res) => {
    const { postId, commentId } = req.params;
    const user = req.user;

    try {
        console.log(`Attempting to delete comment: PostId=${postId}, CommentId=${commentId}`);

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        console.log('Post found:', post);

        // Find the comment by its ID within the post's comments
        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        console.log('Comment found:', comment);

        // Check if user is owner or admin/staff
        const isAdminOrStaff = Array.isArray(user.roles)
            ? user.roles.includes('Admin') || user.roles.includes('Staff')
            : user.roles === 'Admin' || user.roles === 'Staff';

        // Use .equals() for comparing ObjectId
        if (!comment.userId.equals(user._id) && !isAdminOrStaff) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
        }


        console.log('User authorized, deleting comment...');

        // Remove the comment using the `pull` method
        post.comments.pull({ _id: commentId });

        // Save the post after modifying its comments array
        await post.save();

        // --- Emit comment deleted event via Socket.IO ---
        if (req.io) {
            console.log(`🟢 Emitting 'comment_deleted' for post ${postId}, comment ${commentId}`);
            req.io.emit('comment_deleted', { postId: postId, commentId: commentId });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'comment_deleted' event.");
        }
        // --- End Socket.IO emit ---

        res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

const editComment = async (req, res) => {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const user = req.user;

    if (!text) return res.status(400).json({ error: 'Text is required.' });

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // Use .equals() for comparing ObjectId
        const isOwner = comment.userId.equals(user._id);
        const isAdminOrStaff = Array.isArray(user.roles)
                ? user.roles.includes('Admin') || user.roles.includes('Staff')
                : user.roles === 'Admin' || user.roles === 'Staff';

        if (!isOwner && !isAdminOrStaff) {
             return res.status(403).json({ error: 'Unauthorized to edit this comment' });
        }

        comment.text = text.trim(); // Trim whitespace
        await post.save();

        // --- Emit comment edited event via Socket.IO ---
        if (req.io) {
            console.log(`🟢 Emitting 'comment_edited' for post ${postId}, comment ${commentId}`);
            // Send relevant data: postId, commentId, new text, maybe updatedAt?
            req.io.emit('comment_edited', {
                postId: postId,
                commentId: commentId,
                text: comment.text,
                // Optionally add updatedAt if your schema tracks it for comments
                // updatedAt: comment.updatedAt // Assuming comment subdocument has timestamps
            });
        } else {
            console.warn("🔴 req.io not found. Cannot emit 'comment_edited' event.");
        }
        // --- End Socket.IO emit ---

        // Respond with the updated comment object
        res.status(200).json({ success: true, comment: comment.toObject() });
    } catch (err) {
        console.error('Error editing comment:', err);
        res.status(500).json({ error: 'Failed to edit comment' });
    }
};

const getFilteredPosts = async (req, res) => {
    const { search, month, year, page = 1, limit = 20 } = req.query; // Default page/limit
    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // --- Build the query based on search, month, year ---
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { text: { $regex: search, $options: 'i' } }
        ];
    }
    if (month && year) {
        const start = new Date(year, month, 1);
        const end = new Date(year, parseInt(month) + 1, 1);
        query.createdAt = { $gte: start, $lt: end };
    } else if (year) {
        const start = new Date(year, 0, 1);
        const end = new Date(parseInt(year) + 1, 0, 1);
        query.createdAt = { $gte: start, $lt: end };
    }
    // --- End query building ---

    try {
        const totalPosts = await Post.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / parseInt(limit));
        const posts = await Post.find(query)
                                .populate('userId', 'username profilePicture') // Populate user details
                                .populate({ // Populate comments with user details
                                    path: 'comments.userId',
                                    select: 'username profilePicture'
                                 })
                                .sort({ createdAt: -1 })
                                .skip(skip)
                                .limit(parseInt(limit));

        // Render the partial directly
        res.render('partials/postList', {
            posts,
            user: req.user, // Explicitly pass the user object
            layout: false // Important: Prevent rendering the main layout again
        }, (err, html) => {
            if (err) {
                console.error("Error rendering postList partial:", err);
                return res.status(500).json({ error: 'Error rendering posts' });
            }
            // Send JSON response including the HTML and pagination info
            res.json({
                html: html,
                currentPage: parseInt(page),
                totalPages: totalPages
            });
        });

    } catch (err) {
        console.error("Error in getFilteredPosts:", err);
        res.status(500).json({ error: 'Error fetching posts' }); // Send JSON error
    }
};

module.exports = {
    upload,
    createPost,
    getAllPosts,
    updatePost,
    deletePost,
    getPublicIdFromUrl,
    toggleLike,
    addComment,
    deleteComment,
    editComment,
    getFilteredPosts
};
