require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const credentials = require('./middleware/credentials');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const cookieParser = require('cookie-parser');
const sessionMiddleware = require('./middleware/session');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'forum_media',
        resource_type: 'auto'
    }
});

// Update your Cloudinary configuration
const upload = multer({
    storage: new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'forum_media',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images and videos are allowed'), false);
      }
    }
  });
  
  // Enhanced POST endpoint
  app.post('/posts', upload.array('media', 5), async (req, res) => {
    try {
      console.log('Request body:', req.body); // Debug
      console.log('Uploaded files:', req.files); // Debug
  
      // Validate required fields
      if (!req.body.text && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ error: 'Post content or media is required' });
      }
  
      const { title, text } = req.body;
      const userId = req.session.userId || 'anonymous'; // Fallback for testing
  
      // Process media files
      const media = req.files?.map(file => ({
        url: file.path,
        type: file.mimetype.startsWith('image/') ? 'image' : 'video',
        publicId: file.filename
      })) || [];
  
      // Create new post
      const newPost = new ForumPost({
        title,
        text,
        media,
        userId
      });
  
      const savedPost = await newPost.save();
      console.log('Saved post:', savedPost); // Debug
  
      res.status(201).json({
        ...savedPost.toObject(),
        message: 'Post created successfully'
      });
  
    } catch (error) {
      console.error('Post creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// Connecting to MongoDB Atlas
mongoose.set('strictQuery', false);
connectDB();



// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '/public')));

// Register view engine
app.set('view engine', 'ejs');

// Define your routes
const root = require('./routes/root');
const userRoutes = require('./routes/user-routes');
const adminRoutes = require('./routes/admin-routes');
const authRoutes = require('./routes/authRoutes');
const { checkUser } = require('./middleware/authMiddleware');
const postRoutes = require('./routes/postRoutes');
const joinGFMRoutes = require('./routes/joinGFMRoutes');
const joinBlocktimerRoutes = require('./routes/joinBlocktimerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const accountRoutes = require('./routes/accountRoutes');
const blocktimerRoutes = require('./routes/blocktimerRoutes');
const contactRoutes = require('./routes/contactRoutes');
const manageRoutes = require('./routes/manageRoutes');
const liveRoutes = require('./routes/liveRoutes');

const ForumPost = require('./models/ForumPost');

// Enhanced Forum API Routes with Better Error Handling
app.post('/posts', (req, res, next) => {
    upload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                throw new Error(`File upload error: ${err.message}`);
            } else if (err) {
                throw err;
            }

            const { title, text } = req.body;
            const userId = req.session.userId;

            if (!title && !text && (!req.files || req.files.length === 0)) {
                return res.status(400).json({ error: 'Post content is required' });
            }

            const media = req.files?.map(file => ({
                url: file.path,
                type: file.resource_type,
                public_id: file.filename
            })) || [];

            const newPost = new ForumPost({
                title,
                text,
                media,
                userId
            });

            const savedPost = await newPost.save();
            
            // Transform Cloudinary URLs for better display
            savedPost.media = savedPost.media.map(mediaItem => {
                if (mediaItem.type === 'image') {
                    return {
                        ...mediaItem.toObject(),
                        thumbnail: mediaItem.url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
                        fullSize: mediaItem.url.replace('/upload/', '/upload/w_1200,h_1200,c_limit/')
                    };
                }
                return mediaItem;
            });

            res.status(201).json(savedPost);
        } catch (error) {
            console.error('Post creation error:', error);
            res.status(500).json({ 
                error: 'Failed to create post',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
});

app.get('/posts', async (req, res) => {
    try {
        const posts = await ForumPost.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .lean(); // Convert to plain objects for modification

        // Enhance media URLs for frontend display
        const enhancedPosts = posts.map(post => {
            if (post.media && post.media.length > 0) {
                post.media = post.media.map(media => {
                    if (media.type === 'image') {
                        return {
                            ...media,
                            url: media.url.replace('/upload/', '/upload/w_800,h_600,c_fill,q_auto,f_auto/'),
                            thumbnail: media.url.replace('/upload/', '/upload/w_300,h_300,c_fill,q_auto,f_auto/')
                        };
                    }
                    return media;
                });
            }
            return post;
        });

        res.json(enhancedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ 
            error: 'Failed to fetch posts',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



app.delete('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.userId;

        // Verify the user owns the post
        const post = await ForumPost.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.userId.toString() !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const deletedPost = await ForumPost.findByIdAndUpdate(
            id,
            { isDeleted: true, updatedAt: Date.now() },
            { new: true }
        );

        res.json({ message: 'Post marked as deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Toggle Like Route for ForumPost
app.post('/posts/:id/like', async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const alreadyLiked = post.likes.includes(userId);

        if (alreadyLiked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();
        res.json({ liked: !alreadyLiked, totalLikes: post.likes.length });
    } catch (error) {
        console.error('Like toggle error:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

// Placeholder for future comment route
app.post('/posts/:id/comment', async (req, res) => {
    res.status(501).json({ message: 'Comment functionality not implemented yet' });
});


// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server with enhanced logging

// Existing routes
app.get('*', checkUser);
app.use(root);
app.use(userRoutes);
app.use(adminRoutes);
app.use(authRoutes);
app.use(postRoutes);
app.use(joinGFMRoutes);
app.use(joinBlocktimerRoutes);
app.use(uploadRoutes);
app.use('/playlist', playlistRoutes);
app.use(accountRoutes);
app.use(blocktimerRoutes);
app.use(contactRoutes);
app.use(manageRoutes);
app.use('/live', liveRoutes);
app.use('/api', require('./routes/scheduleRoutes'));

// Handle feedback form submission
app.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    // Email options
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: `${process.env.ADMIN_EMAIL}, ${process.env.DLSUD_EMAIL}`,
        replyTo: email,
        subject: `New Message from ${name}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2 style="color: #0b730d;">New Message from ${name}</h2>
                <p>You have received a new message from a user. Here are the details:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Name</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Email</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Message</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${message}</td>
                    </tr>
                </table>
        
                <p style="margin-top: 20px;">Please respond to this message at your earliest convenience.</p>
                <p>Best regards,<br>Your Application Team</p>
            </div>
        `,
    };

    // Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        res.send('Feedback sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send(`Error sending feedback: ${error.message}`);
    }
});

// 404 Handling
app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404', {
            title: 'Page Not Found',
        });
    } else if (req.accepts('json')) {
        res.json({ error: '404 Not Found' });
    } else {
        res.type('txt').send('404 Not Found');
    }
});

mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Database: ${mongoose.connection.db.databaseName}`);
    });
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});
