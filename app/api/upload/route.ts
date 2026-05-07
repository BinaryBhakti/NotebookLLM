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
      buffer,
      fileName: file.name,
      mimeType: mime,
      sessionId
    });
    return NextResponse.json({ docId, fileName: file.name, chunkCount });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
