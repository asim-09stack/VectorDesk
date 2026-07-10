import type { Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/apiResponse';
import { UnauthorizedError } from '@/utils/errors';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { logger } from '@/utils/logger';
import * as chatService from '@/services/chat.service';
import type { AuthenticatedRequest } from '@/types';
import type { SendMessageInput } from '@/validators/chat.validator';

/** Write a single named SSE event with a JSON payload. */
const writeSSE = (res: Response, event: string, data: unknown): void => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * POST /chat — ask a question and stream the grounded answer via SSE.
 *
 * Emits events: `meta` (chatId + citations), repeated `token` (content
 * deltas), `done` (final message), and `error` on failure.
 */
export const sendMessage = asyncHandler<unknown, unknown, SendMessageInput>(
  async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    if (!user) throw new UnauthorizedError();

    // Establish the SSE stream.
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (e.g. nginx) so tokens flush immediately.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // Track client disconnects so we can stop streaming early.
    let clientClosed = false;
    req.on('close', () => {
      clientClosed = true;
    });

    try {
      const stream = chatService.streamAssistantReply({
        userId: user.id,
        chatId: req.body.chatId,
        message: req.body.message,
      });

      for await (const event of stream) {
        if (clientClosed) break;
        writeSSE(res, event.type, event);
      }
    } catch (error) {
      // The headers are already sent, so report the error as an SSE event.
      logger.error('Chat stream error', { error: getErrorMessage(error) });
      if (!clientClosed) {
        writeSSE(res, 'error', { message: getErrorMessage(error) });
      }
    } finally {
      if (!clientClosed) res.end();
    }
  },
);

/** GET /chat/history — list the current user's conversations. */
export const history = asyncHandler(async (req, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  if (!user) throw new UnauthorizedError();
  const chats = await chatService.listChats(user.id);
  sendSuccess(res, chats);
});

/** GET /chat/:id — fetch a conversation with all messages. */
export const getById = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    if (!user) throw new UnauthorizedError();
    const chat = await chatService.getChat(user.id, req.params.id);
    sendSuccess(res, chat);
  },
);

/** DELETE /chat/:id — delete a conversation. */
export const remove = asyncHandler<{ id: string }>(
  async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    if (!user) throw new UnauthorizedError();
    await chatService.deleteChat(user.id, req.params.id);
    sendSuccess(res, { id: req.params.id }, 200, 'Chat deleted');
  },
);
