# VectorDesk

A production-quality **AI Customer Support Chatbot** powered entirely by **local AI models** via [Ollama](https://ollama.com). 

Documents (PDF / DOCX / TXT) are ingested through a RAG pipeline: text is extracted, chunked, embedded with `nomic-embed-text`, and stored in a vector database (ChromaDB). User questions are answered by retrieving the most relevant chunks and **streaming** a grounded response from `qwen2.5:7b`, complete with **source citations**.

---

## Features

**Admin**
- Login (JWT)
- Upload PDF / DOCX / TXT documents
- Automatic ingestion pipeline (extract → chunk → embed → store)
- View documents with live embedding status
- Inspect chunks per document
- Re-index and delete documents

**User**
- Register & login
- Start, continue, and delete multiple chats
- Ask questions and receive **streaming** answers (SSE)
- Markdown rendering with syntax highlighting & copy buttons
- Source citations showing which document answered the question

---

## Tech Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React, TypeScript, Vite, TailwindCSS, Shadcn UI, React Router, React Query, Axios |
| Backend          | Node.js, Express, TypeScript, Prisma ORM                          |
| Database         | PostgreSQL                                                        |
| Vector Database  | ChromaDB                                                          |
| LLM              | Ollama (`qwen2.5:7b`)                                             |
| Embeddings       | Ollama (`nomic-embed-text`)                                       |
| Doc parsing      | pdf-parse, mammoth (DOCX)                                         |
| Streaming        | Server-Sent Events (SSE)                                          |
| Auth             | JWT                                                               |

Cross-cutting: Zod validation, Helmet, CORS, compression, morgan + winston logging, rate limiting, centralized error handling.

---

## Architecture

```
                     ┌──────────────┐
                     │   Frontend   │  React + Vite (dark, ChatGPT-style UI)
                     └──────┬───────┘
                            │  REST + SSE (/api)
                     ┌──────▼───────┐
                     │   Backend    │  Express + Prisma
                     │              │
   Upload ──► extract ─► chunk ─► embed ─► store vectors ─► store metadata
                     │              │
   Ask ──► embed query ─► search top-K ─► build prompt ─► stream answer
                     └───┬───────┬──┘
              ┌──────────▼─┐   ┌─▼──────────┐   ┌───────────┐
              │ PostgreSQL │   │  ChromaDB  │   │  Ollama   │
              │ (metadata) │   │ (vectors)  │   │ (LLM+emb) │
              └────────────┘   └────────────┘   └───────────┘
```

---

## Monorepo Structure

```
VectorDesk/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Zod-validated env → typed config
│   │   ├── controllers/     # HTTP handlers (auth, document, chat)
│   │   ├── db/              # Prisma client singleton
│   │   ├── middlewares/     # auth, validation, upload, rate-limit, errors
│   │   ├── routes/          # Express routers
│   │   ├── services/        # chat, document, embedding, llm, vector
│   │   ├── validators/      # Zod schemas
│   │   ├── types/           # Shared types
│   │   └── utils/           # logger, errors, chunker, textExtractor, prompt, jwt
│   ├── prisma/              # schema, migrations, seed
│   └── uploads/             # uploaded source documents
│
├── frontend/                # React + Vite client
│   └── src/
│       ├── components/      # ui/, chat/, admin/
│       ├── hooks/           # useAuth, useChat
│       ├── lib/             # axios client, query client, utils
│       ├── pages/           # Dashboard, Admin, Chat, Login, Register
│       ├── services/        # auth, chat (SSE), document
│       └── types/           # Shared types
│
├── docker-compose.yml       # Postgres + ChromaDB (+ optional app services)
└── README.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Docker](https://www.docker.com) & Docker Compose
- [Ollama](https://ollama.com) installed and running locally

Pull the required models **before** running:

```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

---

## Quick Start (local development)

### 1. Start infrastructure (Postgres + ChromaDB)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit JWT_SECRET etc.
npm install
npm run prisma:generate
npm run prisma:deploy         # apply migrations (or: npm run prisma:migrate)
npm run seed                  # create default admin + demo user
npm run dev                   # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173.

### Default seeded accounts

| Role  | Email                     | Password   |
| ----- | ------------------------- | ---------- |
| Admin | `admin@vectordesk.local`  | `Admin@123` |
| User  | `user@vectordesk.local`   | `User@123`  |

> Change these in production. New self-service registrations are always regular users; promote admins directly in the database.

---

## Run the full stack in Docker

Ollama still runs natively on the host (for GPU/Metal acceleration). Bring up everything else in containers:

```bash
docker compose --profile app up -d --build
```

- Frontend → http://localhost:8080
- Backend API → http://localhost:4000
- The backend runs `prisma migrate deploy` automatically on start.

Seed the database once containers are healthy:

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

---

## Environment Variables (backend)

| Variable                 | Default                        | Description                          |
| ------------------------ | ------------------------------ | ------------------------------------ |
| `PORT`                   | `4000`                         | API port                             |
| `CORS_ORIGIN`            | `http://localhost:5173`        | Allowed origin(s), comma-separated   |
| `DATABASE_URL`           | —                              | PostgreSQL connection string         |
| `JWT_SECRET`             | —                              | Secret for signing JWTs (≥16 chars)  |
| `JWT_EXPIRES_IN`         | `7d`                           | Token lifetime                       |
| `OLLAMA_BASE_URL`        | `http://localhost:11434`       | Ollama server                        |
| `OLLAMA_CHAT_MODEL`      | `qwen2.5:7b`                   | Chat model                           |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text`             | Embedding model                      |
| `CHROMA_URL`             | `http://localhost:8000`        | ChromaDB server                      |
| `CHROMA_COLLECTION`      | `vectordesk_documents`         | Collection name                      |
| `CHUNK_SIZE`             | `1000`                         | Chunk size (characters)              |
| `CHUNK_OVERLAP`          | `200`                          | Overlap between chunks               |
| `RAG_TOP_K`              | `5`                            | Chunks retrieved per query           |
| `MAX_UPLOAD_SIZE_MB`     | `25`                           | Max upload size                      |

---

## API

Base path: `/api`

| Method | Endpoint                    | Auth       | Description                          |
| ------ | --------------------------- | ---------- | ------------------------------------ |
| POST   | `/auth/register`            | –          | Create account, returns JWT          |
| POST   | `/auth/login`               | –          | Login, returns JWT                   |
| GET    | `/auth/me`                  | user       | Current profile                      |
| POST   | `/documents/upload`         | admin      | Upload a document (multipart `file`) |
| GET    | `/documents`                | admin      | List documents + status              |
| GET    | `/documents/:id/chunks`     | admin      | Inspect a document's chunks          |
| POST   | `/documents/:id/reindex`    | admin      | Re-run ingestion                     |
| DELETE | `/documents/:id`            | admin      | Delete document + vectors            |
| POST   | `/chat`                     | user       | Ask a question (**SSE stream**)      |
| GET    | `/chat/history`             | user       | List conversations                   |
| GET    | `/chat/:id`                 | user       | Conversation with messages           |
| DELETE | `/chat/:id`                 | user       | Delete conversation                  |

**`POST /chat` SSE events**: `meta` (chatId + citations) → repeated `token` (content deltas) → `done` (final message) → `error` (on failure).

---

## RAG Prompt

```
You are an AI customer support assistant.
Only answer using the provided context.
If the answer is unavailable in the context, respond with
"I couldn't find that information."

Context:
{retrieved_chunks}

Question:
{question}
```

---

## Scripts

**Backend**

| Script                   | Description                        |
| ------------------------ | ---------------------------------- |
| `npm run dev`            | Start with hot reload (tsx)        |
| `npm run build`          | Compile to `dist/`                 |
| `npm start`              | Run compiled server                |
| `npm run typecheck`      | Type-check without emitting        |
| `npm run prisma:migrate` | Create/apply a dev migration       |
| `npm run prisma:deploy`  | Apply migrations (prod)            |
| `npm run seed`           | Seed default users                 |

**Frontend**

| Script            | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Vite dev server          |
| `npm run build`   | Type-check + production build |
| `npm run preview` | Preview the build        |

---

## License

MIT
# VectorDesk
