# NotebookLM Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployed Next.js RAG app where users upload PDF/TXT documents and chat with them, answers grounded in document content with citations.

**Architecture:** Next.js 14 App Router full-stack app. API routes orchestrate ingestion (PDFLoader → RecursiveCharacterTextSplitter → OpenAI embeddings → Qdrant) and retrieval (embed query → Qdrant similarity search → grounded LLM call). Sessions scoped via httpOnly cookie; one shared Qdrant collection filtered by `sessionId` metadata.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, React, `@langchain/community`, `@langchain/openai`, `@langchain/qdrant`, `langchain`, `openai`, Qdrant Cloud, Vercel.

**Spec:** `docs/superpowers/specs/2026-05-07-notebook-llm-design.md`

---

## File Structure

```
.
├── app/
│   ├── api/
│   │   ├── upload/route.ts              # POST: ingest file
│   │   ├── chat/route.ts                # POST: question → answer + citations
│   │   └── documents/
│   │       ├── route.ts                 # GET: list docs in session
│   │       └── [docId]/route.ts         # DELETE: remove doc
│   ├── layout.tsx                       # root layout, Tailwind
│   ├── page.tsx                         # main UI shell
│   └── globals.css                      # Tailwind directives
├── components/
│   ├── Uploader.tsx                     # drag-drop file upload
│   ├── DocumentList.tsx                 # session doc list + delete
│   ├── ChatWindow.tsx                   # message list + input
│   └── MessageBubble.tsx                # user/assistant bubble + citations
├── lib/
│   ├── qdrant.ts                        # client + collection bootstrap
│   ├── ingest.ts                        # parse + chunk + embed + upsert
│   ├── retrieve.ts                      # embed query + similarity search
│   ├── prompts.ts                       # grounded system prompt
│   ├── session.ts                       # cookie helpers
│   └── types.ts                         # shared TS types
├── tests/
│   ├── ingest.test.ts                   # chunking behavior
│   └── prompts.test.ts                  # prompt format
├── .env.example
├── .env.local                           # gitignored
├── .gitignore
├── README.md
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`, `.env.example`

- [ ] **Step 1: Init Next.js manually (avoid create-next-app interactive prompts)**

Run from project root:
```bash
npm init -y
npm install next@14 react@18 react-dom@18
npm install -D typescript @types/react @types/node @types/react-dom tailwindcss postcss autoprefixer vitest @vitejs/plugin-react
npx tailwindcss init -p
```

- [ ] **Step 2: Write `package.json` scripts**

Edit `package.json` to set `"name": "notebook-llm"` and add scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: `next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverComponentsExternalPackages: ["pdf-parse"] }
};
```

- [ ] **Step 5: `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};
export default config;
```

- [ ] **Step 6: `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
html, body { height: 100%; }
body { font-family: ui-sans-serif, system-ui, sans-serif; }
```

- [ ] **Step 7: `app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notebook LLM", description: "Chat with your documents" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: `app/page.tsx` (placeholder)**

```tsx
export default function Page() {
  return <main className="p-8">Notebook LLM — scaffolding ready.</main>;
}
```

- [ ] **Step 9: `.gitignore`**

```
node_modules
.next
.env.local
.env
*.log
.DS_Store
/tmp
```

- [ ] **Step 10: `.env.example`**

```
OPENAI_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION=notebook-llm
```

- [ ] **Step 11: Verify dev server starts**

Run: `npm run dev`
Expected: server starts on localhost:3000, page renders "Notebook LLM — scaffolding ready."
Stop with Ctrl+C.

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

## Task 2: Install RAG dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install LangChain + OpenAI + Qdrant + utilities**

```bash
npm install openai @langchain/openai @langchain/community @langchain/qdrant @langchain/core langchain pdf-parse uuid
npm install -D @types/uuid
```

- [ ] **Step 2: Verify install**

Run: `npm ls @langchain/qdrant`
Expected: no errors, version printed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add RAG dependencies"
```

---

## Task 3: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write types**

```ts
export type Citation = {
  fileName: string;
  page: number | null;
  snippet: string;
  chunkIndex: number;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
};

export type DocumentSummary = {
  docId: string;
  fileName: string;
  chunkCount: number;
};

export type ChunkMetadata = {
  sessionId: string;
  docId: string;
  fileName: string;
  page: number | null;
  chunkIndex: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: shared TS types for RAG pipeline"
```

---

## Task 4: Session cookie helper

**Files:**
- Create: `lib/session.ts`

- [ ] **Step 1: Implement**

```ts
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "nlm_session";

export function getOrCreateSessionId(): string {
  const jar = cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return id;
}

export function getSessionId(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/session.ts
git commit -m "feat: session cookie helpers"
```

---

## Task 5: Qdrant client + collection bootstrap

**Files:**
- Create: `lib/qdrant.ts`

- [ ] **Step 1: Implement**

```ts
import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = process.env.QDRANT_COLLECTION || "notebook-llm";
const VECTOR_SIZE = 3072; // text-embedding-3-large

let cached: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (cached) return cached;
  cached = new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!
  });
  return cached;
}

export function getCollectionName(): string {
  return COLLECTION;
}

export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();
  const list = await client.getCollections();
  if (list.collections.some(c => c.name === COLLECTION)) return;
  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" }
  });
  // Index sessionId + docId for fast filtering
  await client.createPayloadIndex(COLLECTION, { field_name: "sessionId", field_schema: "keyword" });
  await client.createPayloadIndex(COLLECTION, { field_name: "docId", field_schema: "keyword" });
}
```

- [ ] **Step 2: Install qdrant client (dependency of @langchain/qdrant but imported directly here)**

```bash
npm install @qdrant/js-client-rest
```

- [ ] **Step 3: Commit**

```bash
git add lib/qdrant.ts package.json package-lock.json
git commit -m "feat: qdrant client and collection bootstrap"
```

---

## Task 6: Grounded prompt module

**Files:**
- Create: `lib/prompts.ts`
- Test: `tests/prompts.test.ts`

- [ ] **Step 1: Configure vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": "/" } }
});
```

- [ ] **Step 2: Write failing test**

`tests/prompts.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../lib/prompts";

describe("buildSystemPrompt", () => {
  it("includes the strict grounding rules", () => {
    const p = buildSystemPrompt("CTX");
    expect(p).toMatch(/ONLY/);
    expect(p).toMatch(/I couldn't find this in the uploaded document/);
    expect(p).toMatch(/CTX/);
  });

  it("returns the not-found phrase verbatim helper", () => {
    expect(NOT_FOUND_MESSAGE).toBe("I couldn't find this in the uploaded document(s).");
  });
});

import { NOT_FOUND_MESSAGE } from "../lib/prompts";
```

- [ ] **Step 3: Run test, expect failure**

Run: `npx vitest run tests/prompts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`lib/prompts.ts`:
```ts
export const NOT_FOUND_MESSAGE = "I couldn't find this in the uploaded document(s).";

export function buildSystemPrompt(context: string): string {
  return `You are a document Q&A assistant. Answer the user's question using ONLY the context provided below, which consists of excerpts from documents the user has uploaded.

Rules:
1. If the context does not contain enough information to answer, respond exactly: "${NOT_FOUND_MESSAGE}"
2. Do NOT use any prior knowledge outside the context.
3. Cite sources inline using the format [fileName, p.N] after each claim. If page is unknown, use [fileName].
4. Keep answers concise and faithful to the source wording.

Context:
${context}`;
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npx vitest run tests/prompts.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts vitest.config.ts
git commit -m "feat: grounded system prompt with tests"
```

---

## Task 7: Ingestion pipeline

**Files:**
- Create: `lib/ingest.ts`
- Test: `tests/ingest.test.ts`

- [ ] **Step 1: Write failing test for chunking behavior**

`tests/ingest.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { chunkText } from "../lib/ingest";

describe("chunkText", () => {
  it("splits long text into ~1000-char chunks with overlap", async () => {
    const text = "abcdefghij ".repeat(500); // ~5500 chars
    const chunks = await chunkText(text, "doc.txt", "sess1", "doc1");
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.pageContent.length).toBeLessThanOrEqual(1000);
      expect(c.metadata.sessionId).toBe("sess1");
      expect(c.metadata.docId).toBe("doc1");
      expect(c.metadata.fileName).toBe("doc.txt");
    }
  });

  it("assigns sequential chunkIndex", async () => {
    const text = "x".repeat(3000);
    const chunks = await chunkText(text, "f.txt", "s", "d");
    chunks.forEach((c, i) => expect(c.metadata.chunkIndex).toBe(i));
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run tests/ingest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/ingest.ts`**

```ts
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import { getQdrantClient, getCollectionName, ensureCollection } from "./qdrant";
import type { ChunkMetadata } from "./types";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

export async function chunkText(
  text: string,
  fileName: string,
  sessionId: string,
  docId: string
): Promise<Document<ChunkMetadata>[]> {
  const pieces = await splitter.splitText(text);
  return pieces.map((content, i) => new Document<ChunkMetadata>({
    pageContent: content,
    metadata: { sessionId, docId, fileName, page: null, chunkIndex: i }
  }));
}

async function chunkPdf(
  buffer: Buffer,
  fileName: string,
  sessionId: string,
  docId: string
): Promise<Document<ChunkMetadata>[]> {
  const tmpPath = path.join(os.tmpdir(), `${randomUUID()}.pdf`);
  await writeFile(tmpPath, buffer);
  try {
    const loader = new PDFLoader(tmpPath);
    const pages = await loader.load();
    const out: Document<ChunkMetadata>[] = [];
    let chunkIndex = 0;
    for (const page of pages) {
      const pageNum = (page.metadata as any)?.loc?.pageNumber ?? null;
      const pieces = await splitter.splitText(page.pageContent);
      for (const piece of pieces) {
        out.push(new Document<ChunkMetadata>({
          pageContent: piece,
          metadata: { sessionId, docId, fileName, page: pageNum, chunkIndex: chunkIndex++ }
        }));
      }
    }
    return out;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function ingestFile(args: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sessionId: string;
}): Promise<{ docId: string; chunkCount: number }> {
  const docId = randomUUID();
  let chunks: Document<ChunkMetadata>[];
  if (args.mimeType === "application/pdf") {
    chunks = await chunkPdf(args.buffer, args.fileName, args.sessionId, docId);
  } else {
    chunks = await chunkText(args.buffer.toString("utf-8"), args.fileName, args.sessionId, docId);
  }
  if (chunks.length === 0) throw new Error("No content extracted from file");

  await ensureCollection();
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-large" });
  const vectors = await embeddings.embedDocuments(chunks.map(c => c.pageContent));

  const client = getQdrantClient();
  await client.upsert(getCollectionName(), {
    wait: true,
    points: chunks.map((c, i) => ({
      id: randomUUID(),
      vector: vectors[i],
      payload: { ...c.metadata, content: c.pageContent }
    }))
  });

  return { docId, chunkCount: chunks.length };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run tests/ingest.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/ingest.ts tests/ingest.test.ts
git commit -m "feat: ingestion pipeline with chunking + embedding + qdrant upsert"
```

---

## Task 8: Retrieval module

**Files:**
- Create: `lib/retrieve.ts`

- [ ] **Step 1: Implement**

```ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { getQdrantClient, getCollectionName } from "./qdrant";
import type { Citation, ChunkMetadata } from "./types";

export type RetrievedChunk = ChunkMetadata & { content: string; score: number };

export async function retrieveChunks(
  question: string,
  sessionId: string,
  k = 4
): Promise<RetrievedChunk[]> {
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-large" });
  const [vector] = await embeddings.embedDocuments([question]);
  const client = getQdrantClient();
  const result = await client.search(getCollectionName(), {
    vector,
    limit: k,
    filter: { must: [{ key: "sessionId", match: { value: sessionId } }] },
    with_payload: true
  });
  return result.map(r => {
    const p = r.payload as any;
    return {
      sessionId: p.sessionId,
      docId: p.docId,
      fileName: p.fileName,
      page: p.page ?? null,
      chunkIndex: p.chunkIndex,
      content: p.content,
      score: r.score ?? 0
    };
  });
}

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks.map((c, i) => {
    const tag = c.page != null ? `${c.fileName}, p.${c.page}` : c.fileName;
    return `[#${i + 1} ${tag}]\n${c.content}`;
  }).join("\n\n---\n\n");
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map(c => ({
    fileName: c.fileName,
    page: c.page,
    snippet: c.content.slice(0, 240),
    chunkIndex: c.chunkIndex
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/retrieve.ts
git commit -m "feat: retrieval + context formatting + citation builder"
```

---

## Task 9: Upload API route

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { ingestFile } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "text/plain"]);

export async function POST(req: NextRequest) {
  try {
    const sessionId = getOrCreateSessionId();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
    }
    const mime = file.type || (file.name.endsWith(".txt") ? "text/plain" : "");
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Only PDF and TXT supported" }, { status: 415 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { docId, chunkCount } = await ingestFile({
      buffer, fileName: file.name, mimeType: mime, sessionId
    });
    return NextResponse.json({ docId, fileName: file.name, chunkCount });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "Upload failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: upload API route"
```

---

## Task 10: Chat API route

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionId } from "@/lib/session";
import { retrieveChunks, formatContext, toCitations } from "@/lib/retrieve";
import { buildSystemPrompt, NOT_FOUND_MESSAGE } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }
    const body = await req.json();
    const question = String(body?.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }
    const chunks = await retrieveChunks(question, sessionId, 4);
    if (chunks.length === 0) {
      return NextResponse.json({ answer: NOT_FOUND_MESSAGE, citations: [] });
    }
    const context = formatContext(chunks);
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        { role: "user", content: question }
      ]
    });
    const answer = completion.choices[0]?.message?.content ?? NOT_FOUND_MESSAGE;
    return NextResponse.json({ answer, citations: toCitations(chunks) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "Chat failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: chat API route with grounded generation"
```

---

## Task 11: Documents API routes

**Files:**
- Create: `app/api/documents/route.ts`
- Create: `app/api/documents/[docId]/route.ts`

- [ ] **Step 1: Implement list route**

`app/api/documents/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getQdrantClient, getCollectionName } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function GET() {
  const sessionId = getSessionId();
  if (!sessionId) return NextResponse.json({ documents: [] });
  const client = getQdrantClient();
  const counts = new Map<string, { fileName: string; count: number }>();
  let offset: string | number | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const res: any = await client.scroll(getCollectionName(), {
      filter: { must: [{ key: "sessionId", match: { value: sessionId } }] },
      with_payload: true,
      limit: 256,
      offset
    });
    for (const point of res.points) {
      const p = point.payload;
      const cur = counts.get(p.docId) ?? { fileName: p.fileName, count: 0 };
      cur.count += 1;
      counts.set(p.docId, cur);
    }
    if (!res.next_page_offset) break;
    offset = res.next_page_offset;
  }
  const documents = [...counts.entries()].map(([docId, v]) => ({
    docId, fileName: v.fileName, chunkCount: v.count
  }));
  return NextResponse.json({ documents });
}
```

- [ ] **Step 2: Implement delete route**

`app/api/documents/[docId]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getQdrantClient, getCollectionName } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function DELETE(_: NextRequest, { params }: { params: { docId: string } }) {
  const sessionId = getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 401 });
  const client = getQdrantClient();
  await client.delete(getCollectionName(), {
    filter: {
      must: [
        { key: "sessionId", match: { value: sessionId } },
        { key: "docId", match: { value: params.docId } }
      ]
    },
    wait: true
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/documents
git commit -m "feat: documents list + delete API routes"
```

---

## Task 12: Uploader component

**Files:**
- Create: `components/Uploader.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";

export function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      onUploaded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
      <input
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        disabled={busy}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        className="block w-full text-sm"
      />
      <p className="text-xs text-gray-500 mt-2">PDF or TXT, up to 10 MB</p>
      {busy && <p className="text-xs text-blue-600 mt-2">Indexing…</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Uploader.tsx
git commit -m "feat: Uploader component"
```

---

## Task 13: DocumentList component

**Files:**
- Create: `components/DocumentList.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import type { DocumentSummary } from "@/lib/types";

export function DocumentList({
  documents, onDelete
}: { documents: DocumentSummary[]; onDelete: (docId: string) => void }) {
  if (documents.length === 0) {
    return <p className="text-xs text-gray-500 px-2">No documents uploaded yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {documents.map(d => (
        <li key={d.docId} className="flex items-center justify-between bg-white rounded px-2 py-1 text-sm">
          <span className="truncate" title={d.fileName}>
            {d.fileName} <span className="text-gray-400">({d.chunkCount})</span>
          </span>
          <button
            onClick={() => onDelete(d.docId)}
            className="text-xs text-red-600 hover:underline ml-2"
          >
            remove
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/DocumentList.tsx
git commit -m "feat: DocumentList component"
```

---

## Task 14: MessageBubble component

**Files:**
- Create: `components/MessageBubble.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";
import type { Citation } from "@/lib/types";

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export function MessageBubble({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        isUser ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
      }`}>
        <div>{message.content}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 text-xs">
            <button onClick={() => setOpen(!open)} className="underline text-gray-600">
              {open ? "Hide" : "Show"} sources ({message.citations.length})
            </button>
            {open && (
              <ul className="mt-1 space-y-1">
                {message.citations.map((c, i) => (
                  <li key={i} className="border-l-2 border-gray-300 pl-2 text-gray-700">
                    <div className="font-mono text-[10px] text-gray-500">
                      {c.fileName}{c.page != null ? ` · p.${c.page}` : ""}
                    </div>
                    <div>{c.snippet}…</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MessageBubble.tsx
git commit -m "feat: MessageBubble with expandable citations"
```

---

## Task 15: ChatWindow component

**Files:**
- Create: `components/ChatWindow.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";
import { MessageBubble, type Message } from "./MessageBubble";
import type { ChatResponse } from "@/lib/types";

export function ChatWindow({ hasDocuments }: { hasDocuments: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setMessages(m => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const j: ChatResponse | { error: string } = await res.json();
      if ("error" in j) {
        setMessages(m => [...m, { role: "assistant", content: `Error: ${j.error}` }]);
      } else {
        setMessages(m => [...m, { role: "assistant", content: j.answer, citations: j.citations }]);
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-8">
            {hasDocuments
              ? "Ask a question about your uploaded documents."
              : "Upload a document to start chatting."}
          </p>
        )}
        {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        {busy && <p className="text-xs text-gray-500">Thinking…</p>}
      </div>
      <div className="border-t bg-white p-3 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Ask about your documents…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          disabled={busy || !hasDocuments}
        />
        <button
          onClick={send}
          disabled={busy || !hasDocuments || !input.trim()}
          className="bg-blue-600 text-white px-4 rounded text-sm disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ChatWindow.tsx
git commit -m "feat: ChatWindow component"
```

---

## Task 16: Main page wiring

**Files:**
- Modify: `app/page.tsx` (full replacement)

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Uploader } from "@/components/Uploader";
import { DocumentList } from "@/components/DocumentList";
import { ChatWindow } from "@/components/ChatWindow";
import type { DocumentSummary } from "@/lib/types";

export default function Page() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    const j = await res.json();
    setDocs(j.documents ?? []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function remove(docId: string) {
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="h-screen grid grid-cols-[320px_1fr]">
      <aside className="border-r bg-gray-100 p-4 space-y-4 overflow-y-auto">
        <h1 className="text-lg font-semibold">Notebook LLM</h1>
        <Uploader onUploaded={refresh} />
        <div>
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Documents</h2>
          <DocumentList documents={docs} onDelete={remove} />
        </div>
      </aside>
      <section className="h-screen">
        <ChatWindow hasDocuments={docs.length > 0} />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire main page (sidebar + chat)"
```

---

## Task 17: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# Notebook LLM

A NotebookLM-style RAG application: upload PDF or TXT documents, then chat with them. Answers are grounded strictly in the uploaded content with inline citations.

**Live demo:** <vercel URL — fill in after deploy>

## Features
- Upload PDF or plain-text documents
- Chunking → embedding → vector storage → semantic retrieval → grounded LLM generation
- Multi-document sessions with delete
- Inline citations (`[fileName, p.N]`) and a "Sources" panel for verification
- "I couldn't find this in the uploaded document(s)." when answer is not in context

## Architecture

```
Browser (React)
  ├── /api/upload      ingest: PDFLoader → RecursiveCharacterTextSplitter
  │                     → OpenAI text-embedding-3-large → Qdrant upsert
  ├── /api/chat        retrieve top-4 chunks (sessionId-filtered)
  │                     → grounded prompt → gpt-4.1-mini (temp 0.2)
  └── /api/documents   list / delete by docId
```

## Chunking strategy

`RecursiveCharacterTextSplitter` with `chunkSize: 1000`, `chunkOverlap: 200`.

- Splits hierarchically on `\n\n`, `\n`, ` ` to preserve paragraph and sentence boundaries.
- 1000-char chunks fit comfortably under embedding token limits while retaining enough context per chunk.
- 200-char overlap (20%) prevents key info from being split across boundaries unrecoverably.
- For PDFs, page numbers are preserved as metadata so citations include `p.N`.

## Local setup

```bash
git clone <repo>
cd notebook-llm
npm install
cp .env.example .env.local
# fill in OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY
npm run dev
```

## Tests

```bash
npm test
```

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo on Vercel.
3. Add the four env vars from `.env.example`.
4. Deploy. The Qdrant collection bootstraps itself on first upload.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with architecture + chunking strategy"
```

---

## Task 18: End-to-end manual verification

**Files:** none

- [ ] **Step 1: Get Qdrant Cloud credentials**

Sign up at cloud.qdrant.io → create a free cluster → copy URL + API key into `.env.local`.

- [ ] **Step 2: Run locally**

```bash
npm run dev
```

- [ ] **Step 3: Upload a never-before-seen PDF**

In browser at http://localhost:3000:
- Upload a PDF (e.g., a research paper or product manual).
- Confirm it appears in the sidebar with a chunk count.

- [ ] **Step 4: Ask questions and verify grounding**

- Ask a question whose answer IS in the document → answer cites pages, content matches PDF.
- Ask a question whose answer is NOT in the document → response is exactly "I couldn't find this in the uploaded document(s)."
- Click "Show sources" → snippets visible.

- [ ] **Step 5: Delete document, verify removal**

Click "remove" on the doc → asking the same question now returns the not-found message.

- [ ] **Step 6: Test TXT upload**

Upload a .txt file, ask a question, verify answer.

- [ ] **Step 7: Run tests**

```bash
npm test
```
Expected: all green.

---

## Task 19: Deploy to Vercel

**Files:** none (deployment only)

- [ ] **Step 1: Push to GitHub**

```bash
gh repo create notebook-llm --public --source=. --remote=origin --push
```
(Or create the repo manually in the GitHub UI and `git remote add origin … && git push -u origin main`.)

- [ ] **Step 2: Import on Vercel**

- vercel.com → Add New → Project → import the GitHub repo.
- Framework preset: Next.js (auto).
- Build command: default.

- [ ] **Step 3: Set environment variables in Vercel project settings**

- `OPENAI_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION` = `notebook-llm`

- [ ] **Step 4: Deploy**

Click Deploy. Wait for build to succeed.

- [ ] **Step 5: Smoke test the live URL**

- Visit the Vercel URL.
- Upload a PDF.
- Ask a question, verify a grounded answer with citations.

- [ ] **Step 6: Add live URL to README**

Replace `<vercel URL — fill in after deploy>` placeholder in `README.md` with the real URL.

```bash
git add README.md
git commit -m "docs: add live demo URL"
git push
```

---

## Acceptance checklist (mirrors spec §13)

- [ ] Public GitHub repo with README documenting setup, architecture, chunking strategy.
- [ ] Live Vercel URL reachable without local setup.
- [ ] Upload a never-before-seen PDF → 3 questions → grounded answers with visible citations.
- [ ] Question outside the document → "I couldn't find…" message.
- [ ] Multiple docs in one session, queryable across.
- [ ] Delete removes a doc's chunks from Qdrant.
- [ ] `npm test` passes.
