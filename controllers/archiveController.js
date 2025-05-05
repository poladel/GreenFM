const Archive = require('../models/Archive');
const cloudinary = require('../config/cloudinaryConfig');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// <<< ADDED: Define Limits >>>
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 100 MB in bytes
// <<< END ADDED >>>

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'archives',
    resource_type: 'auto',
    // <<< MODIFIED: Generate unique public_id >>>
    public_id: (req, file) => {
        // Get filename without extension
        const nameWithoutExt = path.parse(file.originalname).name;
        // Append timestamp for uniqueness
        return `${nameWithoutExt}-${Date.now()}`;
    },
    // <<< END MODIFIED public_id >>>
  },
});
const upload = multer({
    storage: storage,
    // <<< ADDED: Limits configuration >>>
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES // Apply the limit here
    },
    // <<< END ADDED >>>
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
}).array('files', 20); // Accept up to 20 files with field name 'files'

// <<< MOVED: Helper function for Cloudinary cleanup to module scope >>>
const cleanupCloudinaryFiles = async (files) => {
    if (!files || files.length === 0) return;
    console.log('Attempting to delete uploaded files from Cloudinary due to error...');
    for (const file of files) {
        try {
            // file.filename is the public_id without the folder path when using CloudinaryStorage like this
            // It includes the timestamp we added: e.g., 'some-file-1681800000'
            const publicIdWithFolder = `archives/${file.filename}`;
            await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: 'auto' });
            console.log(`Deleted orphaned file: ${publicIdWithFolder}`);
        } catch (cleanupError) {
            console.error(`Failed to delete orphaned file ${file.filename}:`, cleanupError);
        }
    }
};
// <<< END MOVED HELPER >>>

// <<< RENAME FUNCTION, REMOVE routeInfo, DEFINE PARAMS INTERNALLY >>>
exports.getArchives = async (req, res, next) => { // Renamed, removed routeInfo
    try {
        const archives = await Archive.find().sort({ createdAt: -1 });
        res.render('2-user/4-archives', { // Render the specific view
            pageTitle: 'Archives', // Defined internally
            cssFile: 'css/archive.css', // Defined internally
            user: res.locals.user, // Get user from res.locals
            headerTitle: 'ARCHIVES', // Defined internally
            currentPath: req.path,
            archives: archives // Pass fetched archives
        });
    } catch (err) {
        console.error("Error fetching archives:", err);
        // Pass user to error page if possible
        res.status(500).render('error', {
             pageTitle: 'Error',
             headerTitle: 'Error',
             message: 'Failed to load archives',
             error: process.env.NODE_ENV === 'development' ? err : {},
             user: res.locals.user
        });
    }
};
// <<< END RENAMED FUNCTION >>>

// <<< ADDED: Controller function to check folder name existence >>>
exports.checkFolderName = async (req, res) => {
    try {
        const { folderName } = req.body;

        if (!folderName || !folderName.trim()) {
            return res.status(400).json({ error: 'Folder name is required.' });
        }

        const trimmedFolderName = folderName.trim();
        const existingFolder = await Archive.findOne({
            folderName: { $regex: `^${trimmedFolderName}$`, $options: 'i' } // Case-insensitive exact match
        });

        if (existingFolder) {
            // Name already exists
            return res.status(409).json({ error: `Folder name "${trimmedFolderName}" already exists. Please choose a different name.` }); // 409 Conflict
        } else {
            // Name is unique
            return res.status(200).json({ message: 'Folder name is available.' });
        }
    } catch (err) {
        console.error('Error checking folder name:', err);
        return res.status(500).json({ error: 'Server error while checking folder name.' });
    }
};
// <<< END checkFolderName >>>


// POST /upload → upload files and save metadata
exports.uploadFiles = (req, res) => {
    upload(req, res, async function (err) {
      // <<< MODIFIED: Handle Multer file size limit error >>>
      if (err instanceof multer.MulterError) {
        console.error('Multer error creating folder:', err);
        // Check specifically for file size limit exceeded
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` });
        }
        // Handle other potential multer errors
        return res.status(500).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        console.error('Unknown error creating folder:', err);
        return res.status(500).json({ error: 'Upload failed due to an unknown error' });
      }
      // <<< END MODIFIED >>>

      try {
        const folderName = req.body.folderName?.trim(); // Trim whitespace
        // ... existing folder name checks (required, duplicate folder name) ...
        if (!folderName) {
          await cleanupCloudinaryFiles(req.files); // Clean up if folder name missing
          return res.status(400).json({ error: 'Folder name is required' });
        }

        // <<< ADDED: Check for duplicate folder name (case-insensitive check recommended) >>>
        const existingFolder = await Archive.findOne({
            folderName: { $regex: `^${folderName}$`, $options: 'i' } // Case-insensitive exact match
        });

        if (existingFolder) {
            await cleanupCloudinaryFiles(req.files); // Clean up uploaded files
            return res.status(409).json({ error: `Folder name "${folderName}" already exists. Please choose a different name.` }); // 409 Conflict
        }
        // <<< END Duplicate Check >>>


        const filesData = req.files?.map(file => ({
            url: file.path, // Cloudinary URL
            name: file.originalname // Original filename from upload
        })) || [];

        // <<< ADDED: Check for duplicate filenames within the initial upload >>>
        const fileNames = filesData.map(f => f.name.toLowerCase()); // Use lowercase for case-insensitive check
        const uniqueFileNames = new Set(fileNames);
        if (uniqueFileNames.size !== fileNames.length) {
            await cleanupCloudinaryFiles(req.files); // Clean up uploaded files
            return res.status(400).json({ error: 'Duplicate filenames detected in upload. Please ensure all uploaded files have unique names.' });
        }
        // <<< END Duplicate Filename Check >>>

        console.log('📂 Uploading:', { folderName, filesData });

        const newArchive = new Archive({
          folderName, // Use the trimmed name
          files: filesData,
        });

        await newArchive.save();
        console.log('✅ Saved to DB:', newArchive);

        // <<< ADDED: Emit socket event for new folder >>>
        req.io.emit('archive_created', newArchive);
        // <<< END ADDED >>>

        return res.status(200).json({ message: 'Files uploaded and saved', archive: newArchive });
      } catch (err) {
        console.error('DB save or check error:', err);
        await cleanupCloudinaryFiles(req.files); // Attempt cleanup on any error after upload
        return res.status(500).json({ error: 'Could not save folder to database.' });
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

      // TODO: Implement Cloudinary file deletion for all files in the folder if needed
      // This requires iterating through archive.files and calling cleanupCloudinaryFiles or similar

      await archive.deleteOne();

      // <<< ADDED: Emit socket event for deleted folder >>>
      req.io.emit('archive_deleted', { folderId: id });
      // <<< END ADDED >>>

      return res.status(200).json({ message: 'Folder deleted' });
    } catch (err) {
      console.error('Error deleting folder:', err);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
  };
  
  exports.addFilesToFolder = (req, res) => {
    upload(req, res, async function (err) {
      // <<< MODIFIED: Handle Multer file size limit error >>>
      if (err instanceof multer.MulterError) {
        console.error('Multer error adding files:', err);
        // Check specifically for file size limit exceeded
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` });
        }
        // Handle other potential multer errors
        return res.status(500).json({ error: `Multer upload failed: ${err.message}` });
      } else if (err) {
        console.error('Unknown error adding files:', err);
        return res.status(500).json({ error: 'Upload failed due to an unknown error' });
      }
      // <<< END MODIFIED >>>

      const folderId = req.params.id;
      const newFilesData = req.files?.map(file => ({
          url: file.path,
          name: file.originalname
      })) || [];

      if (newFilesData.length === 0) {
          return res.status(400).json({ error: 'No files were uploaded' });
      }

      // <<< ADDED: Check for duplicate filenames within the new upload batch >>>
      const newFileNamesLower = newFilesData.map(f => f.name.toLowerCase());
      const uniqueNewFileNames = new Set(newFileNamesLower);
      if (uniqueNewFileNames.size !== newFileNamesLower.length) {
          await cleanupCloudinaryFiles(req.files); // Use req.files for cleanup
          return res.status(400).json({ error: 'Duplicate filenames detected in upload batch. Please ensure all newly uploaded files have unique names.' });
      }
      // <<< END Duplicate Filename Check >>>

      try {
        const folder = await Archive.findById(folderId);
        if (!folder) {
            await cleanupCloudinaryFiles(req.files); // Use req.files for cleanup
            return res.status(404).json({ error: 'Folder not found' });
        }

        // <<< ADDED: Check for conflicts between new files and existing files >>>
        const existingFileNamesLower = folder.files.map(f => f.name.toLowerCase());
        const conflicts = newFileNamesLower.filter(newName => existingFileNamesLower.includes(newName));

        if (conflicts.length > 0) {
            await cleanupCloudinaryFiles(req.files); // Use req.files for cleanup
            return res.status(409).json({ error: `Filename conflict(s) detected: ${conflicts.join(', ')}. Please rename the uploaded file(s).` }); // 409 Conflict
        }
        // <<< END Conflict Check >>>


        folder.files.push(...newFilesData); // Push the array of objects
        await folder.save();

        // <<< ADDED: Emit socket event for updated folder >>>
        // Send the entire updated folder object
        req.io.emit('archive_updated', folder);
        // <<< END ADDED >>>

        return res.status(200).json({ message: 'Files added', folder });
      } catch (err) {
        console.error('Error adding files to DB:', err);
        await cleanupCloudinaryFiles(req.files); // Use req.files for cleanup
        return res.status(500).json({ error: 'Could not update folder' });
      }
    });
  };


// <<< Utility function to extract full public_id from Cloudinary URL >>>
// Example URL: https://res.cloudinary.com/demo/image/upload/v1681800000/archives/some-file-1681800000.jpg
const extractPublicIdFromUrl = (url) => {
    try {
        const urlParts = url.split('/');
        const folderIndex = urlParts.indexOf('archives');
        if (folderIndex === -1 || folderIndex + 1 >= urlParts.length) {
            console.error('Could not find "archives/" segment in URL:', url);
            return null; // Or throw error
        }
        // Get the part after 'archives/' and remove the extension
        const filenameWithExt = urlParts[folderIndex + 1];
        const publicIdWithoutFolder = path.parse(filenameWithExt).name; // e.g., 'some-file-1681800000'
        return `archives/${publicIdWithoutFolder}`; // e.g., 'archives/some-file-1681800000'
    } catch (e) {
        console.error('Error extracting public_id from URL:', url, e);
        return null;
    }
};


exports.deleteFileFromFolder = async (req, res) => {
    try {
      const { id } = req.params; // folderId
      const { fileUrl } = req.body;

      if (!fileUrl) return res.status(400).json({ error: 'File URL required' });

      const folder = await Archive.findById(id);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });

      const fileToDelete = folder.files.find(f => f.url === fileUrl);
      if (!fileToDelete) {
           return res.status(404).json({ error: 'File URL not found in this folder' });
      }

      // --- Cloudinary Deletion ---
      try {
          // <<< MODIFIED: Use utility function to extract full public_id >>>
          const publicIdWithFolder = extractPublicIdFromUrl(fileUrl);
          if (!publicIdWithFolder) {
              throw new Error('Failed to extract public_id from URL for deletion.');
          }

          console.log(`Attempting to delete from Cloudinary: ${publicIdWithFolder}`);

          // Determine resource type (optional, Cloudinary often infers)
          const fileExt = path.extname(fileUrl).substring(1).toLowerCase();
          let resourceType = 'raw'; // Default
          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(fileExt)) resourceType = 'image';
          else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(fileExt)) resourceType = 'video';

          await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: resourceType });
          console.log(`Successfully deleted from Cloudinary: ${publicIdWithFolder}`);

      } catch (cloudinaryError) {
          console.error('Cloudinary deletion error (proceeding with DB removal):', cloudinaryError);
          // Log and continue, DB removal will happen anyway
      }
      // --- End Cloudinary Deletion ---

      folder.files = folder.files.filter(f => f.url !== fileUrl);
      await folder.save();

      // <<< ADDED: Emit socket event for updated folder >>>
      // Send the entire updated folder object
      req.io.emit('archive_updated', folder);
      // <<< END ADDED >>>

      return res.status(200).json({ message: 'File deleted' });
    } catch (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ error: 'Server error while deleting file' });
    }
};


exports.renameFileInFolder = async (req, res) => {
    try {
        const { id } = req.params; // folderId
        const { originalUrl, newFileName } = req.body;

        if (!originalUrl || !newFileName) {
            return res.status(400).json({ error: 'Original URL and new filename required' });
        }

        const folder = await Archive.findById(id);
        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const fileIndex = folder.files.findIndex(f => f.url === originalUrl);
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found within the folder' });
        }

        // Check for filename conflict within the DB folder record (case-insensitive)
        const newFileNameLower = newFileName.toLowerCase();
        const conflictingFileInDB = folder.files.find((file, index) =>
            index !== fileIndex && file.name.toLowerCase() === newFileNameLower
        );
        if (conflictingFileInDB) {
            return res.status(409).json({ error: `Another file named "${newFileName}" already exists in this folder. Please choose a different name.` });
        }

        // --- Cloudinary Renaming ---
        let newUrl;
        try {
            // <<< MODIFIED: Extract original full public_id >>>
            const originalPublicId = extractPublicIdFromUrl(originalUrl);
            if (!originalPublicId) {
                throw new Error('Failed to extract original public_id from URL for renaming.');
            }

            // <<< MODIFIED: Construct new unique public_id >>>
            const newBaseName = path.parse(newFileName).name;
            // Generate a new unique ID for the renamed file
            const newPublicId = `archives/${newBaseName}-${Date.now()}`;

            console.log(`Attempting to rename in Cloudinary: ${originalPublicId} -> ${newPublicId}`);

            // Perform the rename in Cloudinary
            // Note: We are renaming TO a NEW unique public_id, so overwrite:false is fine
            // as the target ID should not exist yet.
            const renameResult = await cloudinary.uploader.rename(originalPublicId, newPublicId, {
                overwrite: false
            });

            newUrl = renameResult.secure_url; // This URL will contain the new unique public_id
            console.log(`Successfully renamed in Cloudinary. New URL: ${newUrl}`);

        } catch (cloudinaryError) {
            console.error('Cloudinary rename error:', cloudinaryError);
            // A 409 here would be unexpected now, but handle just in case
             if (cloudinaryError.http_code === 409 || (cloudinaryError.message && cloudinaryError.message.includes('exists'))) {
                 return res.status(409).json({ error: `Cloud storage conflict during rename. This might be a temporary issue. Please try again or choose a different name.` });
             }
            return res.status(500).json({ error: 'Failed to rename file in cloud storage.' });
        }
        // --- End Cloudinary Renaming ---

        // Update the file URL and name in the MongoDB array
        folder.files[fileIndex].url = newUrl;
        folder.files[fileIndex].name = newFileName;
        folder.markModified('files');

        await folder.save();

        // <<< ADDED: Emit socket event for updated folder >>>
        // Send the entire updated folder object
        req.io.emit('archive_updated', folder);
        // <<< END ADDED >>>

        return res.status(200).json({
            message: 'File renamed successfully',
            updatedFile: folder.files[fileIndex]
        });

    } catch (err) {
        console.error('Error renaming file:', err);
        return res.status(500).json({ error: 'Server error while renaming file' });
    }
};

// <<< ADDED: Controller function to rename a folder >>>
exports.renameFolder = async (req, res) => {
    try {
        const { id } = req.params; // folderId
        const { newFolderName } = req.body;
        const trimmedNewName = newFolderName?.trim();

        if (!trimmedNewName) {
            return res.status(400).json({ error: 'New folder name is required.' });
        }

        // Check if the new name already exists (case-insensitive, excluding the current folder)
        const existingFolder = await Archive.findOne({
            _id: { $ne: id }, // Exclude the current folder being renamed
            folderName: { $regex: `^${trimmedNewName}$`, $options: 'i' }
        });

        if (existingFolder) {
            return res.status(409).json({ error: `Folder name "${trimmedNewName}" already exists. Please choose a different name.` });
        }

        // Find the folder to rename
        const folderToRename = await Archive.findById(id);
        if (!folderToRename) {
            return res.status(404).json({ error: 'Folder not found.' });
        }

        // Update the folder name
        folderToRename.folderName = trimmedNewName;
        await folderToRename.save();

        console.log(`✅ Folder renamed in DB: ${id} -> ${trimmedNewName}`);

        // Emit socket event for renamed folder
        req.io.emit('archive_renamed', folderToRename);

        return res.status(200).json({
            message: 'Folder renamed successfully',
            updatedFolder: folderToRename
        });

    } catch (err) {
        console.error('Error renaming folder:', err);
        return res.status(500).json({ error: 'Server error while renaming folder.' });
    }
};
// <<< END renameFolder >>>
