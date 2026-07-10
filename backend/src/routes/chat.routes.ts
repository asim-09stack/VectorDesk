import { Router } from 'express';
import * as chatController from '@/controllers/chat.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  chatIdParamSchema,
  sendMessageSchema,
} from '@/validators/chat.validator';

const router = Router();

// All chat routes require an authenticated user.
router.use(authenticate);

router.post('/', validate({ body: sendMessageSchema }), chatController.sendMessage);
router.get('/history', chatController.history);
router.get('/:id', validate({ params: chatIdParamSchema }), chatController.getById);
router.delete('/:id', validate({ params: chatIdParamSchema }), chatController.remove);

export default router;
