import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '@/config';
import { morganStream } from '@/utils/logger';
import { globalRateLimiter } from '@/middlewares/rateLimit.middleware';
import {
  errorHandler,
  notFoundHandler,
} from '@/middlewares/error.middleware';
import apiRoutes from '@/routes';

/**
 * Build and configure the Express application.
 *
 * The middleware order is intentional:
 *   1. Security headers (helmet)
 *   2. CORS
 *   3. Body parsing + compression
 *   4. HTTP request logging (morgan → winston)
 *   5. Rate limiting
 *   6. Routes
 *   7. 404 handler
 *   8. Global error handler (must be last)
 */
export const createApp = (): Application => {
  const app = express();

  // Trust the first proxy hop so client IPs (for rate limiting) are accurate
  // when running behind a reverse proxy / load balancer.
  app.set('trust proxy', 1);

  // 1. Security headers.
  app.use(helmet());

  // 2. CORS — restrict to the configured frontend origin(s).
  app.use(
    cors({
      origin: config.server.corsOrigins,
      credentials: true,
    }),
  );

  // 3. Body parsing + response compression.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // 4. HTTP request logging routed through winston.
  app.use(
    morgan(config.isProduction ? 'combined' : 'dev', {
      stream: morganStream,
    }),
  );

  // 5. Global rate limiting.
  app.use(globalRateLimiter);

  // Lightweight health check (useful for Docker / load balancers).
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        env: config.env,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 6. Mount the versioned API router.
  app.use('/api', apiRoutes);

  // 7. Unmatched routes → 404.
  app.use(notFoundHandler);

  // 8. Centralized error handling (must be registered last).
  app.use(errorHandler);

  return app;
};
