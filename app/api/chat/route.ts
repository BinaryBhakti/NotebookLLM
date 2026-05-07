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
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
