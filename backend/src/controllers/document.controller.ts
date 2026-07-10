import type { Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/apiResponse';
import { BadRequestError, UnauthorizedError } from '@/utils/errors';
import * as documentService from '@/services/document.service';
import type { AuthenticatedRequest } from '@/types';

/** POST /documents/upload — accept a file and start the ingestion pipeline. */
export const upload = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) {
      throw new BadRequestError('No file uploaded (expected field "file")');
    }
    const body = req.body as { title?: unknown };
    const title = typeof body.title === 'string' ? body.title : undefined;

    const document = await documentService.createDocument(
      req.file,
      req.user.id,
      title,
    );
    sendSuccess(res, document, 201, 'Upload received; processing started');
  },
);

/** GET /documents — list all documents with status and chunk counts. */
export const list = asyncHandler(async (_req, res: Response) => {
  const documents = await documentService.listDocuments();
  sendSuccess(res, documents);
});

/** GET /documents/:id — fetch a single document's metadata. */
export const getOne = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    const document = await documentService.getDocument(req.params.id);
    sendSuccess(res, document);
  },
);

/** GET /documents/:id/chunks — inspect a document's chunks. */
export const getChunks = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    const chunks = await documentService.getDocumentChunks(req.params.id);
    sendSuccess(res, chunks);
  },
);

/** DELETE /documents/:id — remove a document and all its vectors. */
export const remove = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    await documentService.deleteDocument(req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Document deleted');
  },
);

/** POST /documents/:id/reindex — re-run the pipeline for a document. */
export const reindex = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    const document = await documentService.reindexDocument(req.params.id);
    sendSuccess(res, document, 200, 'Re-indexing started');
  },
);
