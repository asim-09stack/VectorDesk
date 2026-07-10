import { ChromaClient, type Collection } from 'chromadb';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ServiceUnavailableError } from '@/utils/errors';
import { embedTexts } from '@/services/embedding.service';

/** Metadata persisted alongside each vector in ChromaDB. */
export interface ChunkMetadata {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  [key: string]: string | number | boolean;
}

/** A single search hit returned from a similarity query. */
export interface VectorSearchResult {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  /** Similarity score in [0,1]; higher is more relevant. */
  score: number;
}

/**
 * Custom embedding function so ChromaDB uses our local Ollama model for any
 * server-side embedding, avoiding its optional default-embedding dependency.
 */
const ollamaEmbeddingFunction = {
  generate: (texts: string[]): Promise<number[][]> => embedTexts(texts),
};

const chroma = new ChromaClient({ path: config.chroma.url });

// Cache the collection handle so we don't re-fetch it on every call.
let collectionPromise: Promise<Collection> | null = null;

/** Lazily get (or create) the single documents collection. */
const getCollection = async (): Promise<Collection> => {
  if (!collectionPromise) {
    collectionPromise = chroma
      .getOrCreateCollection({
        name: config.chroma.collection,
        embeddingFunction: ollamaEmbeddingFunction,
        // Cosine space so distances map cleanly to a [0,1] similarity score.
        metadata: { 'hnsw:space': 'cosine' },
      })
      .catch((error: unknown) => {
        collectionPromise = null; // allow retry on next call
        logger.error('Failed to open ChromaDB collection', {
          error: error instanceof Error ? error.message : error,
        });
        throw new ServiceUnavailableError(
          'Failed to connect to ChromaDB. Is the vector database running?',
        );
      });
  }
  return collectionPromise;
};

/** Verify ChromaDB connectivity (used at startup / health checks). */
export const pingVectorStore = async (): Promise<void> => {
  await chroma.heartbeat();
};

/**
 * Upsert a batch of chunk vectors for a document.
 *
 * @param items - Chunks with precomputed embeddings and metadata.
 */
export const addChunks = async (
  items: {
    id: string;
    embedding: number[];
    text: string;
    metadata: ChunkMetadata;
  }[],
): Promise<void> => {
  if (items.length === 0) return;
  const collection = await getCollection();
  await collection.upsert({
    ids: items.map((i) => i.id),
    embeddings: items.map((i) => i.embedding),
    documents: items.map((i) => i.text),
    metadatas: items.map((i) => i.metadata),
  });
};

/**
 * Similarity search: find the top-K chunks most relevant to a query embedding.
 *
 * @param queryEmbedding - Embedding of the user's question.
 * @param topK - Number of results to return.
 * @returns Ranked results with normalized similarity scores.
 */
export const searchChunks = async (
  queryEmbedding: number[],
  topK: number,
): Promise<VectorSearchResult[]> => {
  const collection = await getCollection();
  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const ids = result.ids[0] ?? [];
  const documents = result.documents[0] ?? [];
  const metadatas = result.metadatas[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, i) => {
    const distance = distances[i] ?? 1;
    return {
      id,
      text: documents[i] ?? '',
      metadata: (metadatas[i] ?? {}) as ChunkMetadata,
      // Cosine distance ∈ [0,2] → similarity ∈ [0,1].
      score: Math.max(0, 1 - distance / 2),
    };
  });
};

/** Remove all vectors belonging to a document (used on delete / re-index). */
export const deleteDocumentChunks = async (
  documentId: string,
): Promise<void> => {
  const collection = await getCollection();
  await collection.delete({ where: { documentId } });
};
