import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import documentRoutes from '@/routes/document.routes';
import chatRoutes from '@/routes/chat.routes';

/**
 * Root API router. Feature routers are mounted here and the whole tree is
 * attached under `/api` in `app.ts`.
 */
const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);

export default router;
