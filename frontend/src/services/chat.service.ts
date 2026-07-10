import { api, API_BASE_URL, getToken } from '@/lib/api';
import type { ApiSuccess, Chat, Citation, Message } from '@/types';

/** A chat plus its full message history. */
export interface ChatWithMessages extends Chat {
  messages: Message[];
}

/** Fetch the current user's conversations for the sidebar. */
export const fetchHistory = async (): Promise<Chat[]> => {
  const { data } = await api.get<ApiSuccess<Chat[]>>('/chat/history');
  return data.data;
};

/** Fetch a single conversation with all its messages. */
export const fetchChat = async (id: string): Promise<ChatWithMessages> => {
  const { data } = await api.get<ApiSuccess<ChatWithMessages>>(`/chat/${id}`);
  return data.data;
};

/** Delete a conversation. */
export const deleteChat = async (id: string): Promise<void> => {
  await api.delete(`/chat/${id}`);
};

/** Handlers invoked as the streamed response arrives. */
export interface StreamHandlers {
  onMeta?: (payload: { chatId: string; citations: Citation[] }) => void;
  onToken?: (content: string) => void;
  onDone?: (payload: { messageId: string; content: string }) => void;
  onError?: (message: string) => void;
}

/**
 * Send a message and consume the Server-Sent Events stream.
 *
 * We use `fetch` (not the browser's `EventSource`, which only supports GET and
 * cannot send an Authorization header) and manually parse the SSE frames from
 * the response body stream.
 *
 * @returns An `AbortController` so the caller can cancel an in-flight stream.
 */
export const streamMessage = (
  payload: { chatId?: string; message: string },
  handlers: StreamHandlers,
): AbortController => {
  const controller = new AbortController();

  void (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE frames are separated by a blank line ("\n\n").
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          dispatchFrame(frame, handlers);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return; // caller cancelled — not an error
      handlers.onError?.(
        error instanceof Error ? error.message : 'Streaming failed',
      );
    }
  })();

  return controller;
};

/** Parse a single SSE frame ("event: X\ndata: {...}") and dispatch it. */
const dispatchFrame = (frame: string, handlers: StreamHandlers): void => {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLines.join('\n'));
  } catch {
    return;
  }

  switch (event) {
    case 'meta':
      handlers.onMeta?.(parsed as { chatId: string; citations: Citation[] });
      break;
    case 'token':
      handlers.onToken?.((parsed as { content: string }).content);
      break;
    case 'done':
      handlers.onDone?.(parsed as { messageId: string; content: string });
      break;
    case 'error':
      handlers.onError?.((parsed as { message: string }).message);
      break;
  }
};
