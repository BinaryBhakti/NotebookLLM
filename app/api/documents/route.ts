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
    const res = await client.scroll(getCollectionName(), {
      filter: { must: [{ key: "sessionId", match: { value: sessionId } }] },
      with_payload: true,
      limit: 256,
      offset
    });
    for (const point of res.points) {
      const p = point.payload as { docId?: string; fileName?: string } | null;
      if (!p?.docId || !p?.fileName) continue;
      const cur = counts.get(p.docId) ?? { fileName: p.fileName, count: 0 };
      cur.count += 1;
      counts.set(p.docId, cur);
    }
    if (!res.next_page_offset) break;
    offset = res.next_page_offset as string | number;
  }

  const documents = [...counts.entries()].map(([docId, v]) => ({
    docId,
    fileName: v.fileName,
    chunkCount: v.count
  }));
  return NextResponse.json({ documents });
}
