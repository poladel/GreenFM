const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const Post = require('../models/Post');

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'uploads',
            format: file.mimetype.split('/')[1], // Dynamically set format
            resource_type: "auto"
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

        const post = new Post({
            userId: req.user._id,
            title: title.trim(),
            text: text.trim(),
            media: images,  // Store as an array
            video: video
        });

        await post.save();
        console.log("🟢 Post saved successfully:", post);
        res.json({ success: true, post });

    } catch (err) {
        console.error('🔴 Error saving post:', err);
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

        post.title = title.trim();
        post.text = text.trim();

        await post.save();
        res.json({ success: true, post });
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

        // Delete associated media from Cloudinary
        for (let mediaUrl of post.media) {
            const publicId = getPublicIdFromUrl(mediaUrl);
            const result = await cloudinary.uploader.destroy(publicId);
            console.log('Cloudinary delete result:', result);  // Log result for debugging
        }

        // Delete video from Cloudinary if it exists
        if (post.video) {
            const publicId = getPublicIdFromUrl(post.video);
            const result = await cloudinary.uploader.destroy(publicId);
            console.log('Cloudinary delete result for video:', result);  // Log result for debugging
        }

        // Now, delete the post from the database
        await Post.deleteOne({ _id: postId });

        res.json({ success: true, message: 'Post and associated media deleted successfully' });
    } catch (err) {
        console.error('🔴 Error deleting post:', err);
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

        res.json({ success: true, liked: !hasLiked, likeCount: post.likes.length });
    } catch (err) {
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

        const comment = {
            userId: req.user._id,
            username: req.user.username,
            text
        };

        post.comments.push(comment);
        await post.save();

        res.status(200).json({ success: true, comment });
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

        // Check if user is owner or admin
        if (comment.username !== user.username && user.roles !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
        }

        console.log('User authorized, deleting comment...');
        
        // Remove the comment using the `pull` method
        post.comments.pull({ _id: commentId });

        // Save the post after modifying its comments array
        await post.save();

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

        const isAuthorized = comment.username === user.username ||
            (Array.isArray(user.roles)
                ? user.roles.includes('Admin') || user.roles.includes('Staff')
                : user.roles === 'Admin' || user.roles === 'Staff');

        if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized to edit this comment' });

        comment.text = text;
        await post.save();

        res.status(200).json({ success: true, comment });
    } catch (err) {
        console.error('Error editing comment:', err);
        res.status(500).json({ error: 'Failed to edit comment' });
    }
};

const getFilteredPosts = async (req, res) => {
    const { search, month, year } = req.query;
    const query = {};

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

    try {
        const posts = await Post.find(query).sort({ createdAt: -1 });
        res.render('partials/postList', { posts, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching posts');
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
