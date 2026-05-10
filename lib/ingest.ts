import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { randomUUID } from "crypto";
import { getQdrantClient, getCollectionName, ensureCollection } from "./qdrant";
import { embedTexts } from "./embeddings";
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
  const pieces = (await splitter.splitText(text)).filter(p => p.trim().length > 0);
  return pieces.map(
    (content, i) =>
      new Document<ChunkMetadata>({
        pageContent: content,
        metadata: { sessionId, docId, fileName, page: null, chunkIndex: i }
      })
  );
}

async function chunkPdf(
  buffer: Buffer,
  fileName: string,
  sessionId: string,
  docId: string
): Promise<Document<ChunkMetadata>[]> {
  // @ts-expect-error - deep import has no types
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer,
    opts?: { pagerender?: (pageData: unknown) => Promise<string> }
  ) => Promise<{ text: string; numpages: number }>;

  const pageTexts: string[] = [];
  const pagerender = async (pageData: {
    getTextContent: (opts: {
      normalizeWhitespace: boolean;
      disableCombineTextItems: boolean;
    }) => Promise<{ items: { str: string; transform: number[] }[] }>;
  }) => {
    const content = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    let lastY: number | undefined;
    const parts: string[] = [];
    for (const item of content.items) {
      if (lastY === item.transform[5] || lastY === undefined) parts.push(item.str);
      else parts.push(`\n${item.str}`);
      lastY = item.transform[5];
    }
    const text = parts.join("");
    pageTexts.push(text);
    return text;
  };

  await pdfParse(buffer, { pagerender: pagerender as never });

  const out: Document<ChunkMetadata>[] = [];
  let chunkIndex = 0;
  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i];
    if (!pageText || !pageText.trim()) continue;
    const pieces = (await splitter.splitText(pageText)).filter(p => p.trim().length > 0);
    for (const piece of pieces) {
      out.push(
        new Document<ChunkMetadata>({
          pageContent: piece,
          metadata: { sessionId, docId, fileName, page: i + 1, chunkIndex: chunkIndex++ }
        })
      );
    }
  }
  return out;
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
  if (chunks.length === 0) {
    throw new Error(
      "No extractable text found. The PDF may be scanned/image-only or empty."
    );
  }

  await ensureCollection();
  const vectors = await embedTexts(chunks.map(c => c.pageContent));

  const points = chunks
    .map((c, i) => ({ chunk: c, vector: vectors[i] }))
    .filter(p => Array.isArray(p.vector) && p.vector.length > 0)
    .map(p => ({
      id: randomUUID(),
      vector: p.vector,
      payload: { ...p.chunk.metadata, content: p.chunk.pageContent }
    }));

  if (points.length === 0) {
    throw new Error("Embedding produced no valid vectors for the extracted text.");
  }

  const client = getQdrantClient();
  await client.upsert(getCollectionName(), { wait: true, points });

  return { docId, chunkCount: points.length };
}
