/** A single produced chunk with its ordinal position. */
export interface TextChunk {
  text: string;
  chunkIndex: number;
  /** Rough token estimate (~4 chars/token heuristic). */
  tokenCount: number;
}

export interface ChunkOptions {
  /** Target maximum chunk size in characters. */
  chunkSize: number;
  /** Number of characters to overlap between consecutive chunks. */
  chunkOverlap: number;
}

/** Cheap token estimate; good enough for display and budgeting. */
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/**
 * Split text into overlapping chunks suitable for embedding.
 *
 * Strategy: accumulate paragraphs (split on blank lines) until adding the next
 * one would exceed `chunkSize`, then emit a chunk. A trailing `chunkOverlap`
 * slice of the previous chunk is prepended to the next to preserve context
 * across boundaries. Paragraphs larger than `chunkSize` are hard-split.
 *
 * @param text - The full normalized document text.
 * @param options - Chunk size and overlap (characters).
 * @returns Ordered list of chunks.
 */
export const chunkText = (
  text: string,
  options: ChunkOptions,
): TextChunk[] => {
  const { chunkSize, chunkOverlap } = options;
  const overlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2));

  // First, break oversized paragraphs so no single unit exceeds chunkSize.
  const paragraphs = text
    .split(/\n{2,}/)
    .flatMap((p) => splitOversized(p.trim(), chunkSize))
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }
    // Emit the current chunk and start a new one, carrying overlap forward.
    if (current) chunks.push(current);
    const tail = overlap > 0 ? current.slice(-overlap) : '';
    current = tail ? `${tail}\n\n${para}` : para;
  }
  if (current) chunks.push(current);

  return chunks.map((chunk, index) => ({
    text: chunk.trim(),
    chunkIndex: index,
    tokenCount: estimateTokens(chunk),
  }));
};

/**
 * Hard-split a string longer than `maxLen` into `maxLen`-sized pieces.
 * Returns the input unchanged (as a single-element array) when it already fits.
 */
const splitOversized = (input: string, maxLen: number): string[] => {
  if (input.length <= maxLen) return [input];
  const pieces: string[] = [];
  for (let i = 0; i < input.length; i += maxLen) {
    pieces.push(input.slice(i, i + maxLen));
  }
  return pieces;
};
