# NotebookLM Clone — Design Spec

**Date:** 2026-05-07
**Status:** Approved (awaiting implementation plan)
**Assignment:** GenAI Assignment 03 — Google NotebookLM RAG (10 pts)

## 1. Goal

Build a deployed RAG application where a user uploads a document (PDF or plain text) and asks natural-language questions answered strictly from that document's content. Must satisfy the assignment rubric:

| Criterion | Marks |
|---|---|
| Public GitHub repo | 2 |
| Live deployed project | 2 |
| End-to-end RAG pipeline (chunk → embed → retrieve → generate) | 3 |
| Answer quality grounded in document, not hallucinated | 2 |
| Code quality & documentation | 1 |

## 2. Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **UI:** React + Tailwind CSS
- **LLM:** OpenAI `gpt-4.1-mini` via official `openai` SDK
- **Embeddings:** OpenAI `text-embedding-3-large` via `@langchain/openai`
- **PDF parsing:** `@langchain/community/document_loaders/fs/pdf` (PDFLoader)
- **Chunking:** `RecursiveCharacterTextSplitter` from `langchain/text_splitter`
- **Vector store:** Qdrant Cloud (free tier) via `@langchain/qdrant`
- **Deployment:** Vercel (free tier)
- **Repo:** Public GitHub repository

## 3. Architecture

Single Next.js full-stack app. No separate backend, no external DB, no auth.

```
Browser (React UI)
   │
   ├── POST /api/upload         (multipart file → ingestion pipeline)
   ├── GET  /api/documents      (list docs in session)
   ├── DELETE /api/documents/:id (remove doc)
   └── POST /api/chat           (question → retrieval + generation)
            │
            ▼
   Next.js API routes
            │
   ┌────────┼────────────┬──────────────┐
   ▼        ▼            ▼              ▼
PDFLoader  TextSplitter  OpenAI        Qdrant Cloud
                         (embed+chat)  (vector store)
```

### Session model
- On first visit, server sets a `sessionId` cookie (UUID, httpOnly, 7-day expiry).
- `sessionId` scopes which documents/chunks the user can see.
- A single shared Qdrant collection `notebook-llm` is used; queries filter by `sessionId` metadata.
- No persistent user accounts.

## 4. Components

### 4.1 API routes

**`POST /api/upload`**
- Input: multipart form with `file` field (PDF or TXT, ≤10MB).
- Steps:
  1. Read `sessionId` from cookie (create if missing).
  2. Validate MIME (`application/pdf` or `text/plain`) and size.
  3. Persist file to `/tmp` (Vercel's writable dir).
  4. Parse: PDFLoader for PDF (preserves `page` metadata); for TXT, wrap content in a single Document.
  5. Chunk with `RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })`.
  6. Attach metadata to each chunk: `{ sessionId, docId (uuid), fileName, page (if any), chunkIndex }`.
  7. Embed and upsert into Qdrant collection `notebook-llm`.
  8. Delete temp file.
- Output: `{ docId, fileName, chunkCount }`.

**`POST /api/chat`**
- Input: `{ question: string }`.
- Steps:
  1. Read `sessionId` cookie (reject 401 if missing).
  2. Embed question.
  3. Qdrant similarity search, `k=4`, filter `sessionId == cookie.sessionId`.
  4. Build context block: each chunk rendered as `[#i fileName p.<page>] <text>`.
  5. Call `gpt-4.1-mini` with system prompt (see §5) + user question, `temperature: 0.2`.
  6. Return `{ answer, citations: [{ fileName, page, snippet, chunkIndex }] }`.

**`GET /api/documents`**
- Returns list of unique `{ docId, fileName, chunkCount }` for current session (Qdrant scroll with sessionId filter, deduplicated client-side).

**`DELETE /api/documents/:docId`**
- Deletes all Qdrant points where `sessionId` and `docId` match.

### 4.2 UI components

- `<AppShell>` — two-column layout. Left sidebar (320px), right main area.
- `<Uploader>` — drag-and-drop + file picker. Shows progress and error toasts.
- `<DocumentList>` — list of uploaded docs in session, with delete buttons.
- `<ChatWindow>` — message list + input box. Session-scoped (history not persisted server-side; lives in React state only).
- `<MessageBubble>` — renders user vs assistant messages. Assistant bubbles include expandable "Sources" section showing citation chips with `fileName p.N` and snippet preview on hover/click.

## 5. Grounding strategy (rubric-critical)

The "Answer Quality — grounded, not hallucinated" criterion is worth 2 points and is the easiest to fail. Defensive measures:

### System prompt
```
You are a document Q&A assistant. Answer the user's question using ONLY the
context provided below, which consists of excerpts from documents the user
has uploaded.

Rules:
1. If the context does not contain enough information to answer, respond
   exactly: "I couldn't find this in the uploaded document(s)."
2. Do NOT use any prior knowledge outside the context.
3. Cite sources inline using the format [fileName, p.N] after each claim.
4. Keep answers concise and faithful to the source wording.

Context:
<numbered chunks with fileName + page>
```

### Reinforcements
- `temperature: 0.2` to suppress creative drift.
- If retrieval returns zero chunks, the API short-circuits and returns the "couldn't find" message without calling the LLM.
- Citations are surfaced in the UI so the grader can visually verify grounding.

## 6. Data flow

### Ingestion
```
file → validate → parse (PDFLoader|text) → split (Recursive, 1000/200)
     → embed (text-embedding-3-large) → Qdrant upsert
       metadata: {sessionId, docId, fileName, page, chunkIndex}
```

### Retrieval + generation
```
question → embed → Qdrant search (k=4, filter sessionId)
        → format context with citations
        → gpt-4.1-mini (temp 0.2) with grounded system prompt
        → {answer, citations[]}
```

## 7. Chunking strategy (documented for rubric)

**RecursiveCharacterTextSplitter** with `chunkSize: 1000` characters and `chunkOverlap: 200`.

- Splits hierarchically on `\n\n`, `\n`, ` `, `""` — preserving paragraph and sentence boundaries when possible.
- 1000-char chunks fit comfortably under embedding token limits while retaining enough context per chunk for meaningful retrieval.
- 200-char overlap (20%) prevents key information from being split across boundaries unrecoverably.
- Per-page metadata is preserved from PDFLoader so citations can reference page numbers.

This will be documented in the README's "How it works" section.

## 8. Error handling

| Scenario | Behavior |
|---|---|
| File > 10MB | 413 response, toast: "File too large (max 10MB)" |
| Unsupported MIME | 415 response, toast: "Only PDF and TXT supported" |
| Empty PDF / parse failure | 422 response, toast with reason |
| OpenAI API error | 502 response, toast: "AI service unavailable" |
| Qdrant connection error | 502 response, toast |
| Empty retrieval result | API returns "couldn't find" answer (no LLM call) |
| Missing sessionId on /api/chat | 401 response |

## 9. Environment variables

```
OPENAI_API_KEY=sk-...
QDRANT_URL=https://<cluster>.qdrant.io
QDRANT_API_KEY=...
QDRANT_COLLECTION=notebook-llm
```

`.env.example` committed; `.env.local` gitignored.

## 10. Deployment

- **Hosting:** Vercel.
- **Repo:** Public GitHub repo, README with setup, architecture diagram, chunking strategy doc, live demo link.
- **Qdrant collection bootstrap:** on first upload, if collection missing, create it with vector size 3072 (text-embedding-3-large) and `Cosine` distance.
- **Cold-start:** first request may be slow; acceptable for assignment.

## 11. Out of scope (YAGNI)

- User accounts, login, persistent multi-device sessions.
- Streaming chat responses (can add if trivial after MVP).
- Hybrid search, reranking, query rewriting.
- Markdown/HTML/DOCX uploads — only PDF + TXT per assignment.
- Rate limiting (assignment has no traffic).
- Automated tests — manual testing per project size; if added, focus on chunking + grounded-answer behavior.

## 12. Repository layout (target)

```
.
├── app/
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── chat/route.ts
│   │   └── documents/[[...id]]/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Uploader.tsx
│   ├── DocumentList.tsx
│   ├── ChatWindow.tsx
│   └── MessageBubble.tsx
├── lib/
│   ├── ingest.ts          # parse + chunk + embed + upsert
│   ├── retrieve.ts        # embed query + search
│   ├── qdrant.ts          # client + collection bootstrap
│   ├── prompts.ts         # system prompt
│   └── session.ts         # cookie helpers
├── docs/superpowers/specs/2026-05-07-notebook-llm-design.md
├── .env.example
├── README.md
└── package.json
```

## 13. Acceptance criteria

- [ ] Public GitHub repo with README documenting setup, architecture, chunking strategy.
- [ ] Live URL on Vercel reachable without local setup.
- [ ] Upload a never-before-seen PDF, ask 3 questions, get answers grounded in that PDF with visible citations.
- [ ] Asking a question whose answer is not in the document returns the "couldn't find" message.
- [ ] Multiple documents can coexist in one session and be queried across.
- [ ] Deleting a document removes its chunks from Qdrant.
