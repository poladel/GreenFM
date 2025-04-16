router.post('/posts/:postId/like', async (req, res) => {
    try {
        const { postId } = req.params;
        const { action } = req.body; // 'like' or 'unlike'
        const userId = req.user._id;

        const post = await ForumPost.findById(postId);
        
        if (action === 'like') {
            if (!post.likes.includes(userId)) {
                post.likes.push(userId);
            }
        } else {
            post.likes = post.likes.filter(id => id.toString() !== userId.toString());
        }

        await post.save();
        
        res.json({
            success: true,
            likesCount: post.likes.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.postId)
            .populate('comments.userId', 'username');
            
        res.json(post.comments || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/Forumposts/:postId/comment', async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        post.comments.push({
            userId: req.user._id,
            text: req.body.text
        });
        
        await post.save();
        
        res.json({
            success: true,
            commentsCount: post.comments.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});