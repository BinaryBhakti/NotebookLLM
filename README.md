# Notebook LLM

A NotebookLM-style RAG application. Upload PDF or plain-text documents, then chat with them. Answers are grounded strictly in the uploaded content with inline citations.

**Live demo:** _<add Vercel URL after deploy>_

## Features

- Upload PDF or plain-text documents (≤ 10 MB)
- End-to-end RAG: chunking → embedding → vector storage → semantic retrieval → grounded LLM generation
- Multi-document sessions; delete individual documents
- Inline citations (`[fileName, p.N]`) with an expandable "Sources" panel for verification
- Hard-grounded refusal when the answer is not in the document: `"I couldn't find this in the uploaded document(s)."`

## Architecture

```
Browser (React + Tailwind)
  ├── POST /api/upload         ingest: PDFLoader → RecursiveCharacterTextSplitter
  │                             → OpenAI text-embedding-3-large → Qdrant upsert
  ├── POST /api/chat           retrieve top-4 chunks (sessionId-filtered)
  │                             → grounded prompt → gpt-4.1-mini (temp 0.2)
  ├── GET  /api/documents      list documents in session
  └── DELETE /api/documents/:id remove a document's chunks
```

- **Stack:** Next.js 14 (App Router) + TypeScript, Tailwind, OpenAI, LangChain, Qdrant Cloud, Vercel.
- **Sessions:** A `sessionId` cookie scopes which documents are visible. One shared Qdrant collection is filtered by `sessionId` metadata. No accounts, no DB.

## Chunking strategy

`RecursiveCharacterTextSplitter` with `chunkSize: 1000`, `chunkOverlap: 200`.

- Splits hierarchically on `\n\n` → `\n` → ` ` so paragraph and sentence boundaries are preserved when possible.
- 1000-char chunks fit comfortably under the embedding model's token limit while keeping enough context for meaningful retrieval.
- 200-char overlap (20 %) prevents key information from being severed at chunk boundaries.
- For PDFs, page numbers are preserved as metadata so citations can reference `p.N`.

## Grounding strategy

The `gpt-4.1-mini` call uses `temperature: 0.2` and a system prompt that:

1. Restricts the answer to the supplied context only.
2. Forces the exact phrase `"I couldn't find this in the uploaded document(s)."` when context is insufficient.
3. Requires inline `[fileName, p.N]` citations.

If retrieval returns zero chunks, the API short-circuits and returns the not-found message without calling the LLM.

## Local setup

```bash
git clone <repo-url>
cd "Notebook LLM"
npm install --legacy-peer-deps
cp .env.example .env.local
# fill in OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY (collection defaults to "notebook-llm")
npm run dev
```

Get a free Qdrant Cloud cluster at <https://cloud.qdrant.io>.

## Tests

```bash
npm test
```

Covers chunking behavior and the grounded prompt template.

## Deploy to Vercel

1. Push to a public GitHub repo.
2. <https://vercel.com> → Add New → Project → import the repo.
3. Set the four environment variables from `.env.example`.
4. Deploy. The Qdrant collection bootstraps itself on first upload.

## Project structure

```
app/
  api/
    upload/route.ts            POST: ingest a file
    chat/route.ts              POST: question → grounded answer
    documents/route.ts         GET:  list session documents
    documents/[docId]/route.ts DELETE: remove a document
  layout.tsx, page.tsx, globals.css
components/
  Uploader.tsx                 file picker + POST /api/upload
  DocumentList.tsx             session document list with delete
  ChatWindow.tsx               chat shell + POST /api/chat
  MessageBubble.tsx            user/assistant bubble + citations
lib/
  ingest.ts                    parse → chunk → embed → upsert
  retrieve.ts                  embed query → Qdrant search → format
  qdrant.ts                    client + collection bootstrap
  prompts.ts                   grounded system prompt
  session.ts                   sessionId cookie helpers
  types.ts                     shared TS types
tests/
  ingest.test.ts               chunking behavior
  prompts.test.ts              grounded prompt format
docs/superpowers/
  specs/2026-05-07-notebook-llm-design.md
  plans/2026-05-07-notebook-llm.md
```
