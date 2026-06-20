const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type. Use JPEG, PNG, or WebP.'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/upload/reference-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }
  // Server re-validates the confirmation — never trust an implicit "yes" from the client.
  if (req.body.licenseConfirmed !== 'true') {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'licenseConfirmed must be explicitly true' });
  }

  res.json({
    imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
    source: 'user-upload',
    licenseConfirmed: true,
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
