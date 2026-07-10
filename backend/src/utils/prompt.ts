import type { VectorSearchResult } from '@/services/vector.service';

/** The fixed response used when the context does not contain the answer. */
export const NO_ANSWER_RESPONSE = "I couldn't find that information.";

/**
 * System instruction that constrains the assistant to the retrieved context.
 * Kept separate from the user turn so the model treats it as a standing rule.
 */
export const SYSTEM_PROMPT = [
  'You are an AI customer support assistant.',
  'Only answer using the provided context.',
  'If the answer is unavailable in the context, respond with',
  `"${NO_ANSWER_RESPONSE}"`,
].join('\n');

/**
 * Render retrieved chunks into a numbered context block. Numbering lets the
 * model (and users) reference sources as [1], [2], etc.
 */
export const formatContext = (results: VectorSearchResult[]): string => {
  if (results.length === 0) return '(no relevant context found)';
  return results
    .map(
      (r, i) =>
        `[${i + 1}] (source: ${r.metadata.documentTitle})\n${r.text}`,
    )
    .join('\n\n');
};

/**
 * Build the user turn combining the retrieved context and the question,
 * following the required prompt format.
 */
export const buildUserPrompt = (
  question: string,
  results: VectorSearchResult[],
): string => {
  return [
    'Context:',
    formatContext(results),
    '',
    'Question:',
    question,
  ].join('\n');
};
