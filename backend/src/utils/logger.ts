import winston from 'winston';
import { config } from '@/config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Human-friendly log format used in development. Prints a colorized,
 * single-line message with a timestamp and any stack trace attached.
 */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? ` ${JSON.stringify(meta)}`
      : '';
    return `${ts} ${level}: ${stack ?? message}${metaString}`;
  }),
);

/**
 * Structured JSON format used in production so logs can be ingested by
 * log aggregators (e.g. Loki, CloudWatch, Datadog).
 */
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Application-wide logger. Prefer this over `console.*` so log level,
 * formatting, and destinations stay consistent and configurable.
 */
export const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: config.isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  // Never let a logging failure crash the process.
  exitOnError: false,
});

/**
 * A minimal stream adapter so morgan's HTTP logs flow through winston
 * rather than writing directly to stdout.
 */
export const morganStream = {
  write: (message: string): void => {
    logger.http?.(message.trim()) ?? logger.info(message.trim());
  },
};
