import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as chatService from '@/services/chat.service';
import type { Message } from '@/types';

/** Local id prefix for optimistic (not-yet-persisted) messages. */
const TEMP_PREFIX = 'tmp-';

/**
 * Encapsulates a single chat session's state and the streaming send lifecycle:
 * loading history, optimistic updates, token streaming, citations, new-chat
 * navigation, cancellation, and error handling.
 */
export function useChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // When we create a new chat, skip the reload effect for its id (we already
  // hold the freshly streamed messages in state).
  const skipLoadRef = useRef<string | null>(null);
  const newChatIdRef = useRef<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  // Load an existing conversation's messages when the route id changes.
  useEffect(() => {
    setError(null);
    if (!chatId) {
      setMessages([]);
      return;
    }
    if (skipLoadRef.current === chatId) {
      skipLoadRef.current = null;
      return;
    }
    let active = true;
    chatService
      .fetchChat(chatId)
      .then((chat) => {
        if (active) setMessages(chat.messages);
      })
      .catch(() => {
        if (active) setMessages([]);
      });
    return () => {
      active = false;
    };
  }, [chatId]);

  const finish = useCallback((): void => {
    setIsStreaming(false);
    abortRef.current = null;
    streamingIdRef.current = null;
    void queryClient.invalidateQueries({ queryKey: ['chats'] });
    // If this was a brand-new conversation, move to its URL without reloading.
    if (!chatId && newChatIdRef.current) {
      skipLoadRef.current = newChatIdRef.current;
      navigate(`/chat/${newChatIdRef.current}`, { replace: true });
      newChatIdRef.current = null;
    }
  }, [chatId, navigate, queryClient]);

  const send = useCallback(
    (text: string): void => {
      setError(null);
      const stamp = Date.now();
      const userId = `${TEMP_PREFIX}u-${stamp}`;
      const assistantId = `${TEMP_PREFIX}a-${stamp}`;
      streamingIdRef.current = assistantId;

      const userMsg: Message = {
        id: userId,
        chatId: chatId ?? '',
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: assistantId,
        chatId: chatId ?? '',
        role: 'assistant',
        content: '',
        citations: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      abortRef.current = chatService.streamMessage(
        { chatId, message: text },
        {
          onMeta: ({ chatId: newId, citations }) => {
            newChatIdRef.current = newId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, citations } : m,
              ),
            );
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + token }
                  : m,
              ),
            );
          },
          onDone: ({ messageId, content }) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, id: messageId, content } : m,
              ),
            );
            finish();
          },
          onError: (message) => {
            setError(message);
            // Drop the optimistic pair so the user can retry cleanly.
            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantId && m.id !== userId),
            );
            finish();
          },
        },
      );
    },
    [chatId, finish],
  );

  /** Cancel an in-flight stream, keeping any partial content received. */
  const stop = useCallback((): void => {
    abortRef.current?.abort();
    finish();
  }, [finish]);

  return {
    messages,
    isStreaming,
    error,
    streamingId: streamingIdRef.current,
    send,
    stop,
    hasChat: Boolean(chatId),
  };
}
