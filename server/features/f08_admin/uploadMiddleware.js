const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(__dirname, '../../../../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^\w-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});

// File filter (PDF, DOCX, TXT only)
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type ${ext}. Only PDF, DOCX, and TXT files are permitted.`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter
});

function calculateChecksum(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  upload,
  calculateChecksum,
  UPLOAD_DIR
};

