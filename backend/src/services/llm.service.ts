import axios, { type AxiosInstance } from 'axios';
import type { Readable } from 'node:stream';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ServiceUnavailableError } from '@/utils/errors';

/** A chat message in Ollama's expected format. */
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** HTTP client pointed at the local Ollama server. */
const client: AxiosInstance = axios.create({
  baseURL: config.ollama.baseUrl,
  // Local model calls can be slow on first load; allow a generous timeout.
  timeout: 120_000,
});

/**
 * Generate an embedding vector for a single piece of text using the configured
 * embedding model (nomic-embed-text).
 *
 * @throws {ServiceUnavailableError} if Ollama is unreachable or errors.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const { data } = await client.post<{ embedding: number[] }>(
      '/api/embeddings',
      { model: config.ollama.embeddingModel, prompt: text },
    );
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new ServiceUnavailableError('Ollama returned an empty embedding');
    }
    return data.embedding;
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error;
    logger.error('Embedding generation failed', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ServiceUnavailableError(
      'Failed to generate embedding via Ollama. Is Ollama running and the model pulled?',
    );
  }
};

/**
 * Stream a chat completion from Ollama, yielding response text token-by-token.
 *
 * Ollama's streaming endpoint returns newline-delimited JSON objects; this
 * generator parses each line and yields the incremental `message.content`.
 *
 * @param messages - Full conversation (system + prior turns + new question).
 * @yields Incremental content fragments as they are produced.
 * @throws {ServiceUnavailableError} if the request cannot be established.
 */
export async function* streamChat(
  messages: OllamaChatMessage[],
): AsyncGenerator<string, void, unknown> {
  let stream: Readable;
  try {
    const response = await client.post(
      '/api/chat',
      { model: config.ollama.chatModel, messages, stream: true },
      { responseType: 'stream' },
    );
    stream = response.data as Readable;
  } catch (error) {
    logger.error('Chat stream request failed', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ServiceUnavailableError(
      'Failed to reach Ollama chat endpoint. Is Ollama running and the model pulled?',
    );
  }

  // Ollama emits JSON objects separated by newlines; buffer partial lines.
  let buffer = '';
  for await (const rawChunk of stream) {
    buffer += (rawChunk as Buffer).toString('utf-8');
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        const token = parsed.message?.content;
        if (token) yield token;
        if (parsed.done) return;
      } catch {
        // Ignore malformed/partial lines; the next chunk will complete them.
      }
    }
  }
}

/**
 * Non-streaming chat completion (used where a full string is more convenient,
 * e.g. auto-generating a chat title).
 */
export const generateChat = async (
  messages: OllamaChatMessage[],
): Promise<string> => {
  try {
    const { data } = await client.post<{ message?: { content?: string } }>(
      '/api/chat',
      { model: config.ollama.chatModel, messages, stream: false },
    );
    return data.message?.content?.trim() ?? '';
  } catch (error) {
    logger.error('Chat completion failed', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ServiceUnavailableError('Failed to reach Ollama chat endpoint.');
  }
};
