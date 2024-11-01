const { Router } = require('express');
const upload = require('../middleware/uploadMiddleware');

const router = Router();

// POST route to upload signature
router.post('/upload-signature', upload.single('file'), (req, res) => {
  if (req.file) {
    // The file URL will be available in req.file.path
    res.status(200).json({ url: req.file.path });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

module.exports = router;
