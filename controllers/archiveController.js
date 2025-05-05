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
  
  exports.deleteFolder = async (req, res) => {
    try {
      const { id } = req.params;
  
      const archive = await Archive.findById(id);
      if (!archive) {
        return res.status(404).json({ error: 'Folder not found' });
      }
  
      // Optionally: delete files from Cloudinary
      /*
      for (const fileUrl of archive.files) {
        const publicId = fileUrl.split('/').pop().split('.')[0]; // naive way
        await cloudinary.uploader.destroy(`archives/${publicId}`, { resource_type: 'auto' });
      }
      */
  
      await archive.deleteOne();
      return res.status(200).json({ message: 'Folder deleted' });
    } catch (err) {
      console.error('Error deleting folder:', err);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
  };
  
  exports.addFilesToFolder = (req, res) => {
    upload(req, res, async function (err) {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }
  
      const folderId = req.params.id;
      const fileUrls = req.files?.map(file => file.path) || [];
  
      try {
        const folder = await Archive.findById(folderId);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
  
        folder.files.push(...fileUrls);
        await folder.save();
  
        return res.status(200).json({ message: 'Files added', folder });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not update folder' });
      }
    });
  };
  
  exports.deleteFileFromFolder = async (req, res) => {
    try {
      const { id } = req.params;
      const { fileUrl } = req.body;
  
      if (!fileUrl) return res.status(400).json({ error: 'File URL required' });
  
      const folder = await Archive.findById(id);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
  
      folder.files = folder.files.filter(f => f !== fileUrl);
      await folder.save();
  
      // Optionally delete from Cloudinary
      /*
      const publicId = fileUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`archives/${publicId}`, { resource_type: 'auto' });
      */
  
      return res.status(200).json({ message: 'File deleted' });
    } catch (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ error: 'Server error while deleting file' });
    }
  };
  