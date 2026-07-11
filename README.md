# VectorDesk

An AI customer-support chatbot that answers questions from your own documents (PDF / DOCX / TXT) using **RAG**, running **100% locally** via [Ollama](https://ollama.com) — no paid APIs.

## Stack

React + TypeScript + Vite · Node + Express + Prisma · PostgreSQL · ChromaDB · Ollama (`qwen2.5:7b` + `nomic-embed-text`) · JWT auth · SSE streaming

## How it works

- **Ingest:** upload → extract text → chunk → embed → store vectors (ChromaDB) + metadata (Postgres)
- **Query:** embed question → retrieve top-K chunks → build grounded prompt → stream answer with citations

## Prerequisites

- Node.js 20+, Docker, and [Ollama](https://ollama.com) running locally

```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

## Run

```bash
# 1. Start Postgres + ChromaDB
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:generate && npm run prisma:deploy && npm run seed
npm run dev            # http://localhost:4000

# 3. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

Open http://localhost:5173.

## Usage

Log in as admin → **Admin Console** → upload a document → wait for **Indexed** → open **Chat** and ask questions.

## License

MIT
