import type { Server } from 'node:http';
import { createApp } from '@/app';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { connectDatabase, disconnectDatabase } from '@/db/prisma';

/**
 * Application entrypoint. Verifies dependencies, creates the HTTP server,
 * starts listening, and wires up graceful shutdown + crash handlers.
 */
const start = async (): Promise<void> => {
  // Fail fast if the database is unreachable at boot.
  await connectDatabase();

  const app = createApp();

  const server: Server = app.listen(config.server.port, () => {
    logger.info(
      `🚀 VectorDesk API listening on http://localhost:${config.server.port} [${config.env}]`,
    );
  });

  /**
   * Gracefully close the server, giving in-flight requests a chance to finish
   * before the process exits. Falls back to a forced exit if shutdown stalls.
   */
  const shutdown = (signal: string): void => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      void disconnectDatabase().finally(() => {
        logger.info('HTTP server closed. Bye 👋');
        process.exit(0);
      });
    });

    // Force-exit if graceful shutdown takes too long.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Last-resort handlers so the process logs the cause before dying.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });
};

start().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});
