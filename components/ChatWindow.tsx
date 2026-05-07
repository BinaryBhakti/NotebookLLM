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
        setMessages(m => [
          ...m,
          { role: "assistant", content: j.answer, citations: j.citations }
        ]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setMessages(m => [...m, { role: "assistant", content: `Error: ${msg}` }]);
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
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {busy && <p className="text-xs text-gray-500">Thinking…</p>}
      </div>
      <div className="border-t bg-white p-3 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Ask about your documents…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") send();
          }}
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
