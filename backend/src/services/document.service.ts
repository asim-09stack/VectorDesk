import fs from 'node:fs/promises';
import type { Document } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import { extractText } from '@/utils/textExtractor';
import { chunkText } from '@/utils/chunker';
import { embedTexts } from '@/services/embedding.service';
import {
  addChunks,
  deleteDocumentChunks,
  type ChunkMetadata,
} from '@/services/vector.service';

/** Deterministic vector id for a chunk (also stored on the Chunk row). */
const vectorIdFor = (documentId: string, chunkIndex: number): string =>
  `${documentId}:${chunkIndex}`;

/**
 * Persist a newly uploaded file as a Document record (status PENDING) and
 * kick off asynchronous processing. The record is returned immediately so the
 * client can poll for embedding status.
 */
export const createDocument = async (
  file: Express.Multer.File,
  uploadedById: string,
  title?: string,
): Promise<Document> => {
  const document = await prisma.document.create({
    data: {
      filename: file.filename,
      title: title?.trim() || file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById,
      status: 'PENDING',
    },
  });

  // Fire-and-forget: process in the background; status is tracked on the record.
  void processDocument(document.id).catch((error: unknown) => {
    logger.error('Background document processing failed', {
      documentId: document.id,
      error: error instanceof Error ? error.message : error,
    });
  });

  return document;
};

/**
 * Run the full ingestion pipeline for a document:
 *   extract text → chunk → embed → store vectors → store chunk metadata.
 *
 * Updates the document status throughout (PROCESSING → INDEXED | FAILED).
 */
export const processDocument = async (documentId: string): Promise<void> => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });
  if (!document) throw new NotFoundError('Document not found');

  const filePath = `${config.uploads.dir}/${document.filename}`;

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', error: null },
    });

    // 1. Extract text from the source file.
    const text = await extractText(filePath, document.mimeType);

    // 2. Split into overlapping chunks.
    const chunks = chunkText(text, {
      chunkSize: config.rag.chunkSize,
      chunkOverlap: config.rag.chunkOverlap,
    });
    if (chunks.length === 0) {
      throw new Error('Document produced no chunks');
    }

    // 3. Generate embeddings for every chunk.
    const embeddings = await embedTexts(chunks.map((c) => c.text));

    // 4. Store vectors in ChromaDB (replace any prior vectors for this doc).
    await deleteDocumentChunks(documentId);
    await addChunks(
      chunks.map((chunk, i) => {
        const metadata: ChunkMetadata = {
          documentId,
          documentTitle: document.title,
          chunkIndex: chunk.chunkIndex,
        };
        return {
          id: vectorIdFor(documentId, chunk.chunkIndex),
          embedding: embeddings[i] ?? [],
          text: chunk.text,
          metadata,
        };
      }),
    );

    // 5. Store chunk metadata in PostgreSQL (replace existing rows atomically).
    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { documentId } }),
      prisma.chunk.createMany({
        data: chunks.map((chunk) => ({
          documentId,
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          vectorId: vectorIdFor(documentId, chunk.chunkIndex),
        })),
      }),
    ]);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'INDEXED', chunkCount: chunks.length, error: null },
    });

    logger.info('Document indexed', {
      documentId,
      chunks: chunks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', error: message },
    });
    logger.error('Document processing failed', { documentId, message });
    throw error;
  }
};

/** List all documents (admin view), newest first, with uploader name. */
export const listDocuments = async () => {
  return prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { chunks: true } },
    },
  });
};

/** Fetch a single document or throw 404. */
export const getDocument = async (id: string): Promise<Document> => {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) throw new NotFoundError('Document not found');
  return document;
};

/** Fetch a document's chunks (ordered) for inspection in the admin UI. */
export const getDocumentChunks = async (documentId: string) => {
  await getDocument(documentId); // ensures existence (404 otherwise)
  return prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
    select: {
      id: true,
      chunkIndex: true,
      text: true,
      tokenCount: true,
      vectorId: true,
    },
  });
};

/**
 * Delete a document: remove its vectors, its uploaded file, and its DB record
 * (chunks cascade). Missing file on disk is not treated as an error.
 */
export const deleteDocument = async (id: string): Promise<void> => {
  const document = await getDocument(id);

  await deleteDocumentChunks(id);

  try {
    await fs.unlink(`${config.uploads.dir}/${document.filename}`);
  } catch {
    // File may already be gone; ignore.
  }

  await prisma.document.delete({ where: { id } });
};

/** Re-run the ingestion pipeline for an existing document. */
export const reindexDocument = async (id: string): Promise<Document> => {
  const document = await getDocument(id);
  void processDocument(id).catch((error: unknown) => {
    logger.error('Re-index failed', {
      documentId: id,
      error: error instanceof Error ? error.message : error,
    });
  });
  return document;
};
