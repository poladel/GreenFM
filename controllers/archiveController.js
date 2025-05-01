const Archive = require('../models/Archive');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

// Multer setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'archives',
    resource_type: 'auto',
  },
});
const upload = multer({ storage }).array('files', 20); // 20 max

// GET /archives → render archive page
exports.getArchives = async (req, res) => {
    try {
    const archives = await require('../models/Archive').find().sort({ createdAt: -1 });
      return res.render('2-user/4-archives', {
        pageTitle: 'Archives',
        cssFile: 'css/archive.css',
        headerTitle: 'ARCHIVES',
        user: res.locals.user,
        currentPath: req.path,
        archives
      });
    } catch (err) {
      console.error('Error fetching archives:', err);
      return res.status(500).send('Error loading archives');
    }
  };  

// POST /upload → upload files and save metadata
exports.uploadFiles = (req, res) => {
    upload(req, res, async function (err) {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }
  
      try {
        const folderName = req.body.folderName;
        if (!folderName) {
          return res.status(400).json({ error: 'Folder name is required' });
        }
  
        const fileUrls = req.files?.map(file => file.path) || [];
        
        console.log('📂 Uploading:', { folderName, fileUrls }); // << Add this
  
        const newArchive = new Archive({
          folderName,
          files: fileUrls,
        });
  
        await newArchive.save();
        console.log('✅ Saved to DB:', newArchive); // << Add this
  
        return res.status(200).json({ message: 'Files uploaded and saved', archive: newArchive });
      } catch (err) {
        console.error('DB save error:', err);
        return res.status(500).json({ error: 'Could not save to DB' });
      }
    });
  };
  