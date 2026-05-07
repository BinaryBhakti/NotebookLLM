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

  return (
    <main className="h-screen grid grid-cols-[320px_1fr]">
      <aside className="border-r bg-gray-100 p-4 space-y-4 overflow-y-auto">
        <h1 className="text-lg font-semibold">Notebook LLM</h1>
        <Uploader onUploaded={refresh} />
        <div>
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Documents
          </h2>
          <DocumentList documents={docs} onDelete={remove} />
        </div>
      </aside>
      <section className="h-screen">
        <ChatWindow hasDocuments={docs.length > 0} />
      </section>
    </main>
  );
}
