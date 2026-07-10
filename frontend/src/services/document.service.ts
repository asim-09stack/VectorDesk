import { api } from '@/lib/api';
import type { ApiSuccess, Document } from '@/types';

/** A document as listed in the admin UI, with uploader + chunk count. */
export interface AdminDocument extends Document {
  uploadedBy?: { id: string; name: string; email: string };
  _count?: { chunks: number };
}

/** A single stored chunk (for the inspector). */
export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  vectorId: string;
}

/** List all documents. */
export const fetchDocuments = async (): Promise<AdminDocument[]> => {
  const { data } = await api.get<ApiSuccess<AdminDocument[]>>('/documents');
  return data.data;
};

/** Upload a document file (optionally with a custom title). */
export const uploadDocument = async (
  file: File,
  title?: string,
): Promise<Document> => {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);

  const { data } = await api.post<ApiSuccess<Document>>(
    '/documents/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
};

/** Delete a document and its vectors. */
export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

/** Trigger re-indexing of a document. */
export const reindexDocument = async (id: string): Promise<void> => {
  await api.post(`/documents/${id}/reindex`);
};

/** Fetch a document's chunks for inspection. */
export const fetchDocumentChunks = async (
  id: string,
): Promise<DocumentChunk[]> => {
  const { data } = await api.get<ApiSuccess<DocumentChunk[]>>(
    `/documents/${id}/chunks`,
  );
  return data.data;
};
