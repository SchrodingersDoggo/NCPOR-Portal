import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // video
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB — expedition videos/datasets can be large

const storage = multer.memoryStorage(); // buffer stays in memory, then streamed straight to Cloudinary

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed`));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});
