import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from `.env` at the backend root.
dotenv.config();

/**
 * Schema describing every environment variable the backend depends on.
 * Using Zod here means the process fails fast at boot with a clear error
 * message if any required variable is missing or malformed, instead of
 * surfacing confusing runtime errors later.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('qwen2.5:7b'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),

  // ChromaDB
  CHROMA_URL: z.string().url().default('http://localhost:8000'),
  CHROMA_COLLECTION: z.string().default('vectordesk_documents'),

  // RAG / chunking
  CHUNK_SIZE: z.coerce.number().int().positive().default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(200),
  RAG_TOP_K: z.coerce.number().int().positive().default(5),

  // Uploads
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Aggregate all validation issues into a single readable message.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const env = parsed.data;

/**
 * Strongly-typed, immutable application configuration derived from the
 * validated environment. Import this everywhere instead of reading
 * `process.env` directly so all config access is centralized and typed.
 */
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',

  server: {
    port: env.PORT,
    // Allow a comma-separated list of origins for flexible CORS setups.
    corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  },

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  ollama: {
    baseUrl: env.OLLAMA_BASE_URL,
    chatModel: env.OLLAMA_CHAT_MODEL,
    embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
  },

  chroma: {
    url: env.CHROMA_URL,
    collection: env.CHROMA_COLLECTION,
  },

  rag: {
    chunkSize: env.CHUNK_SIZE,
    chunkOverlap: env.CHUNK_OVERLAP,
    topK: env.RAG_TOP_K,
  },

  uploads: {
    // Resolve the upload directory to an absolute path relative to backend root.
    dir: path.resolve(process.cwd(), env.UPLOAD_DIR),
    maxSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
} as const;

export type AppConfig = typeof config;
