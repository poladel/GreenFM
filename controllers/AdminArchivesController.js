const AdminArchivesModel = require('../models/AdminArchivesModel'); // Your model for storing data

exports.addPost = async (req, res) => {
    try {
        const { videoUrl, imageUrl, description } = req.body;

        // Validate input
        if (!videoUrl && !imageUrl) {
            return res.status(400).json({ message: 'Either video URL or image URL is required.' });
        }

        // Validate the videoUrl format (basic check for YouTube/Facebook links)
        if (videoUrl && !/^https?:\/\/(www\.)?(facebook\.com|youtube\.com)\/.*$/.test(videoUrl)) {
            return res.status(400).json({ message: 'Invalid video URL format. Only Facebook and YouTube links are allowed.' });
        }

        // Validate the imageUrl format (basic check for image links)
        if (imageUrl && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp)$/.test(imageUrl)) {
            return res.status(400).json({ message: 'Invalid image URL format. Only image links are allowed.' });
        }

        // Create a new post with the provided data
        const newPost = new AdminArchivesModel({
            videoUrl: videoUrl || null,  // If there's no video, it will be null
            imageUrl: imageUrl || null,  // If there's no image, it will be null
            description: description || 'No description provided.',
            createdAt: new Date(),
        });

        // Save the post to the database
        await newPost.save();

        // Send a success response with the new post data
        res.status(200).json({ message: 'Post added successfully', post: newPost });
    } catch (err) {
        console.error('Error adding post:', err);
        res.status(500).json({ message: 'Server error. Could not add the post.' });
    }
};
