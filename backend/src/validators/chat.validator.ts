import { z } from 'zod';

/** Payload for `POST /chat` — send a message and stream a reply. */
export const sendMessageSchema = z.object({
  // Omit to start a new conversation; provide to continue an existing one.
  chatId: z.string().uuid().optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message is too long'),
});

/** Route param schema for endpoints that take a chat id. */
export const chatIdParamSchema = z.object({
  id: z.string().uuid('Invalid chat id'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
