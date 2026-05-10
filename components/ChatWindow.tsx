"use client";
import { useEffect, useRef, useState } from "react";
import { MessageBubble, type Message } from "./MessageBubble";
import type { ChatResponse } from "@/lib/types";

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main conclusions?",
  "List any open questions"
];

export function ChatWindow({
  hasDocuments,
  documentCount
}: {
  hasDocuments: boolean;
  documentCount: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
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

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full relative">
      <header className="px-10 pt-7 pb-5 border-b border-[var(--color-rule-soft)] flex items-baseline justify-between">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            Conversation
          </div>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[20px] leading-none text-[var(--color-ink)]">
            {hasDocuments ? (
              <>
                Chatting with{" "}
                <span className="italic text-[var(--color-ink-muted)]">
                  {documentCount} {documentCount === 1 ? "source" : "sources"}
                </span>
              </>
            ) : (
              <span className="italic text-[var(--color-ink-muted)]">No sources yet</span>
            )}
          </h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            clear
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10 space-y-6">
          {empty ? (
            <div className="pt-16 rise">
              <div className="font-[family-name:var(--font-display)] text-[44px] leading-[1.05] tracking-tight text-[var(--color-ink)]">
                Ask anything
                <span className="italic text-[var(--color-ink-muted)]"> grounded</span>
                <br />
                in your{" "}
                <span className="relative">
                  documents
                  <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-[var(--color-accent)]/70" />
                </span>
                .
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-[var(--color-ink-muted)] max-w-md">
                {hasDocuments
                  ? "Answers come strictly from your uploaded sources, with inline citations you can verify."
                  : "Upload a PDF or text file from the sidebar to begin. Your conversation will appear here."}
              </p>

              {hasDocuments && (
                <div className="mt-10">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-3">
                    Try
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rise text-[13px] px-3.5 py-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
                        style={{ animationDelay: `${i * 60 + 120}ms` }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} />)
          )}

          {busy && (
            <div className="flex items-center gap-2 pl-9 rise">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] pulse-dot" />
              <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide text-[var(--color-ink-muted)]">
                thinking
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--color-rule-soft)] bg-[var(--color-paper)]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-10 py-5">
          <form
            onSubmit={e => {
              e.preventDefault();
              send();
            }}
            className="group flex items-end gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] px-4 py-3 focus-within:border-[var(--color-ink-faint)] transition-colors"
          >
            <textarea
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-[14.5px] leading-relaxed placeholder:text-[var(--color-ink-faint)] text-[var(--color-ink)] disabled:cursor-not-allowed"
              placeholder={
                hasDocuments ? "Ask about your sources…" : "Upload a document to begin"
              }
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={busy || !hasDocuments}
            />
            <button
              type="submit"
              disabled={busy || !hasDocuments || !input.trim()}
              className="shrink-0 self-end h-8 px-3.5 rounded-md bg-[var(--color-ink)] text-[var(--color-paper)] text-[12px] font-medium tracking-wide transition-all enabled:hover:bg-[var(--color-accent)] disabled:bg-[var(--color-paper-3)] disabled:text-[var(--color-ink-faint)] disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="Send"
            >
              Send
              <span aria-hidden>→</span>
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-faint)]">
            <span>enter to send · shift+enter for newline</span>
            <span>answers are cited from your sources</span>
          </div>
        </div>
      </div>
    </div>
  );
}
