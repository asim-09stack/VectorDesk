import { generateEmbedding } from '@/services/llm.service';

/** Max number of concurrent embedding requests to Ollama. */
const CONCURRENCY = 4;

/**
 * Generate embeddings for many texts with bounded concurrency.
 *
 * Ollama processes one prompt per `/api/embeddings` call, so we fan out a
 * limited number of parallel requests to keep throughput high without
 * saturating the local model server. Order is preserved: `result[i]` is the
 * embedding for `texts[i]`.
 *
 * @param texts - Chunk texts to embed.
 * @returns Embedding vectors aligned to the input order.
 */
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const results: number[][] = new Array<number[]>(texts.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < texts.length) {
      const index = cursor++;
      const text = texts[index];
      if (text === undefined) continue;
      results[index] = await generateEmbedding(text);
    }
  };

  // Spin up a fixed pool of workers pulling from the shared cursor.
  const pool = Array.from(
    { length: Math.min(CONCURRENCY, texts.length) },
    () => worker(),
  );
  await Promise.all(pool);

  return results;
};

/** Convenience wrapper for embedding a single query string. */
export const embedQuery = (query: string): Promise<number[]> =>
  generateEmbedding(query);
