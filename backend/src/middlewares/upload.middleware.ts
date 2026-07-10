import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { config } from '@/config';
import { BadRequestError } from '@/utils/errors';

// Ensure the upload directory exists before multer tries to write to it.
fs.mkdirSync(config.uploads.dir, { recursive: true });

/** MIME types we can extract text from. */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
]);

/** Human-readable list for error messages. */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

/**
 * Disk storage: files are written to the configured upload directory with a
 * collision-proof name (uuid + original extension). The original name is kept
 * separately on the document record for display.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** Reject files whose type/extension we cannot parse. */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const typeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  if (typeOk || extOk) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
    );
  }
};

/**
 * Configured multer instance for single-file document uploads under the
 * form field name "file".
 */
export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxSizeBytes },
}).single('file');
