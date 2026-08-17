import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { ApiError } from '../utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads');

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB per file
export const MAX_IMAGES = 6;

mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    cb(new ApiError(400, 'Only JPEG, PNG, WEBP or GIF images are allowed', 'INVALID_FILE_TYPE'));
    return;
  }
  cb(null, true);
};

export const uploadImages = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_IMAGES },
  fileFilter,
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter,
});