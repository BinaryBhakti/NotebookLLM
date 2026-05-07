import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
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
  const tmpPath = path.join(os.tmpdir(), `${randomUUID()}.pdf`);
  await writeFile(tmpPath, buffer);
  try {
    const loader = new PDFLoader(tmpPath);
    const pages = await loader.load();
    const out: Document<ChunkMetadata>[] = [];
    let chunkIndex = 0;
    for (const page of pages) {
      const pageNum =
        (page.metadata as { loc?: { pageNumber?: number } })?.loc?.pageNumber ?? null;
      const pieces = await splitter.splitText(page.pageContent);
      for (const piece of pieces) {
        out.push(
          new Document<ChunkMetadata>({
            pageContent: piece,
            metadata: { sessionId, docId, fileName, page: pageNum, chunkIndex: chunkIndex++ }
          })
        );
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
