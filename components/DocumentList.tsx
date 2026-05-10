"use client";
import type { DocumentSummary } from "@/lib/types";

export function DocumentList({
  documents,
  onDelete
}: {
  documents: DocumentSummary[];
  onDelete: (docId: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <p className="px-3 py-4 text-[12px] text-[var(--color-ink-faint)] italic font-[family-name:var(--font-display)]">
        No sources yet.
      </p>
    );
  }
  return (
    <ul className="space-y-0.5">
      {documents.map((d, i) => (
        <li
          key={d.docId}
          className="group flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[var(--color-card)] rise"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="h-1 w-1 rounded-full bg-[var(--color-ink-faint)] group-hover:bg-[var(--color-accent)] transition-colors shrink-0"
              aria-hidden
            />
            <div className="min-w-0">
              <div
                className="truncate text-[13px] text-[var(--color-ink)] leading-tight"
                title={d.fileName}
              >
                {d.fileName}
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-faint)] mt-0.5">
                {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <button
            onClick={() => onDelete(d.docId)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[10px] uppercase tracking-[0.15em] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] font-[family-name:var(--font-mono)]"
            aria-label={`Remove ${d.fileName}`}
          >
            remove
          </button>
        </li>
      ))}
    </ul>
  );
}
