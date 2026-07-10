import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Prisma client singleton.
 *
 * In development the module can be re-evaluated on hot reload, which would
 * otherwise create a new client (and a new connection pool) each time and
 * exhaust database connections. Caching the instance on `globalThis` avoids
 * that while still creating a fresh client in production.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  });

if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/** Verify database connectivity at startup; throws if unreachable. */
export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('🗄️  Connected to PostgreSQL');
};

/** Cleanly disconnect (used during graceful shutdown). */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
