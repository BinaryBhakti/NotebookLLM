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

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(docId: string) {
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    refresh();
  }

  const totalChunks = docs.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <main className="relative h-screen grid grid-cols-[340px_1fr] isolate">
      <aside className="relative border-r border-[var(--color-rule)] bg-[var(--color-paper-2)] flex flex-col">
        <header className="px-7 pt-7 pb-5">
          <div className="flex items-baseline gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] translate-y-[-3px]" />
            <h1 className="font-[family-name:var(--font-display)] text-[22px] leading-none tracking-tight">
              Notebook<span className="italic text-[var(--color-ink-muted)]"> llm</span>
            </h1>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Grounded answers · cited sources
          </p>
        </header>

        <div className="px-7 pb-5">
          <Uploader onUploaded={refresh} />
        </div>

        <div className="px-7 pb-2 flex items-baseline justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)] font-medium">
            Sources
          </h2>
          {docs.length > 0 && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-faint)]">
              {docs.length.toString().padStart(2, "0")} · {totalChunks} chunks
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <DocumentList documents={docs} onDelete={remove} />
        </div>

        <footer className="px-7 py-4 border-t border-[var(--color-rule-soft)] flex items-center justify-between text-[10px] text-[var(--color-ink-faint)] font-[family-name:var(--font-mono)]">
          <span>gemini · qdrant</span>
          <span>v0.1</span>
        </footer>
      </aside>

      <section className="relative h-screen bg-[var(--color-paper)] flex flex-col">
        <ChatWindow hasDocuments={docs.length > 0} documentCount={docs.length} />
      </section>
    </main>
  );
}
