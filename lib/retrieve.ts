import { getQdrantClient, getCollectionName } from "./qdrant";
import { embedQuery } from "./embeddings";
import type { Citation, ChunkMetadata } from "./types";

export type RetrievedChunk = ChunkMetadata & { content: string; score: number };

export async function retrieveChunks(
  question: string,
  sessionId: string,
  k = 4
): Promise<RetrievedChunk[]> {
  const vector = await embedQuery(question);
  const client = getQdrantClient();
  const result = await client.search(getCollectionName(), {
    vector,
    limit: k,
    filter: { must: [{ key: "sessionId", match: { value: sessionId } }] },
    with_payload: true
  });
  return result.map(r => {
    const p = r.payload as Record<string, unknown>;
    return {
      sessionId: String(p.sessionId),
      docId: String(p.docId),
      fileName: String(p.fileName),
      page: (p.page as number | null) ?? null,
      chunkIndex: Number(p.chunkIndex),
      content: String(p.content),
      score: r.score ?? 0
    };
  });
}

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const tag = c.page != null ? `${c.fileName}, p.${c.page}` : c.fileName;
      return `[#${i + 1} ${tag}]\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map(c => ({
    fileName: c.fileName,
    page: c.page,
    snippet: c.content.slice(0, 240),
    chunkIndex: c.chunkIndex
  }));
}
