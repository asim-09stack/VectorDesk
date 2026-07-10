import { Router, type NextFunction, type Request, type Response } from 'express';
import { MulterError } from 'multer';
import * as documentController from '@/controllers/document.controller';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { uploadDocument } from '@/middlewares/upload.middleware';
import { BadRequestError } from '@/utils/errors';

const router = Router();

/**
 * Wrap the multer middleware so its errors (file too large, wrong type) are
 * normalized into our BadRequestError and flow through the global handler.
 */
const handleUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  uploadDocument(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('File is too large'));
      }
      return next(new BadRequestError(err.message));
    }
    if (err) return next(err);
    next();
  });
};

// Every document route requires an authenticated ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.post('/upload', handleUpload, documentController.upload);
router.get('/', documentController.list);
router.get('/:id', documentController.getOne);
router.get('/:id/chunks', documentController.getChunks);
router.post('/:id/reindex', documentController.reindex);
router.delete('/:id', documentController.remove);

export default router;
