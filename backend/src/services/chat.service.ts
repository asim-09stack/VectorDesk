import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { config } from '@/config';
import { NotFoundError } from '@/utils/errors';
import { embedQuery } from '@/services/embedding.service';
import { searchChunks } from '@/services/vector.service';
import {
  streamChat,
  type OllamaChatMessage,
} from '@/services/llm.service';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  NO_ANSWER_RESPONSE,
} from '@/utils/prompt';
import type { Citation } from '@/types';

/** How many prior messages to include as conversation history. */
const HISTORY_LIMIT = 6;

/** Events emitted by the streaming generator, consumed by the SSE controller. */
export type ChatStreamEvent =
  | { type: 'meta'; chatId: string; citations: Citation[] }
  | { type: 'token'; content: string }
  | { type: 'done'; messageId: string; content: string }
  | { type: 'error'; message: string };

/** List a user's chats (sidebar), most recently updated first. */
export const listChats = async (userId: string) => {
  return prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
};

/** Fetch a chat with its messages, verifying ownership. */
export const getChat = async (userId: string, chatId: string) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!chat || chat.userId !== userId) {
    throw new NotFoundError('Chat not found');
  }
  return chat;
};

/** Delete a chat (and its messages via cascade), verifying ownership. */
export const deleteChat = async (
  userId: string,
  chatId: string,
): Promise<void> => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) {
    throw new NotFoundError('Chat not found');
  }
  await prisma.chat.delete({ where: { id: chatId } });
};

/** Derive a short chat title from the first user message. */
const deriveTitle = (message: string): string => {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
};

/** Load recent history for a chat as Ollama-formatted messages. */
const loadHistory = async (
  chatId: string,
): Promise<OllamaChatMessage[]> => {
  const recent = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  // Re-order chronologically and drop any non user/assistant rows.
  return recent
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
};

/**
 * Core RAG + streaming routine.
 *
 * Pipeline: resolve/create chat → persist user message → embed question →
 * vector search (top-K) → build grounded prompt → stream tokens from Ollama →
 * persist the assistant message (with citations).
 *
 * Yields structured events so the controller can relay them over SSE without
 * knowing anything about RAG internals.
 */
export async function* streamAssistantReply(params: {
  userId: string;
  chatId?: string;
  message: string;
}): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const { userId, message } = params;

  // 1. Resolve the chat (create a new one on first message).
  let chatId = params.chatId;
  if (chatId) {
    const existing = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Chat not found');
    }
  } else {
    const created = await prisma.chat.create({
      data: { userId, title: deriveTitle(message) },
    });
    chatId = created.id;
  }

  // 2. Load history BEFORE persisting the new user message.
  const history = await loadHistory(chatId);

  // 3. Persist the user's message.
  await prisma.message.create({
    data: { chatId, role: 'user', content: message },
  });

  // 4. Embed the question and retrieve the most relevant chunks.
  const queryEmbedding = await embedQuery(message);
  const results = await searchChunks(queryEmbedding, config.rag.topK);

  const citations: Citation[] = results.map((r) => ({
    documentId: r.metadata.documentId,
    documentTitle: r.metadata.documentTitle,
    chunkIndex: r.metadata.chunkIndex,
    // Trim long chunks for transport; full text lives in Postgres.
    text: r.text.length > 500 ? `${r.text.slice(0, 500)}…` : r.text,
    score: Number(r.score.toFixed(4)),
  }));

  // 5. Emit metadata (chat id + citations) before streaming tokens.
  yield { type: 'meta', chatId, citations };

  // 6. Build the grounded message list and stream the completion.
  const messages: OllamaChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: buildUserPrompt(message, results) },
  ];

  let answer = '';
  for await (const token of streamChat(messages)) {
    answer += token;
    yield { type: 'token', content: token };
  }

  // Guard against an empty model response.
  const finalContent = answer.trim() || NO_ANSWER_RESPONSE;

  // 7. Persist the assistant message with its citations, and bump chat time.
  const saved = await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: finalContent,
      citations: citations as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  yield { type: 'done', messageId: saved.id, content: finalContent };
}
