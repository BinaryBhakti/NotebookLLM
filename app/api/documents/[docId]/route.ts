import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getQdrantClient, getCollectionName } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function DELETE(
  _: NextRequest,
  { params }: { params: { docId: string } }
) {
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
