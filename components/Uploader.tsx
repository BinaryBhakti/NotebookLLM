"use client";
import { useRef, useState } from "react";

export function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      onUploaded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={`group relative cursor-pointer rounded-md border border-dashed transition-colors px-4 py-5 text-center bg-[var(--color-card)] ${
        dragOver
          ? "border-[var(--color-accent)] bg-[var(--color-paper-3)]"
          : "border-[var(--color-rule)] hover:border-[var(--color-ink-faint)]"
      } ${busy ? "opacity-70 cursor-wait" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        disabled={busy}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
        className="file-native sr-only"
      />

      {busy ? (
        <div className="flex items-center justify-center gap-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] pulse-dot" />
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide text-[var(--color-ink-soft)]">
            indexing
          </span>
        </div>
      ) : (
        <>
          <div className="font-[family-name:var(--font-display)] text-[15px] leading-tight text-[var(--color-ink)]">
            Drop a document
            <span className="text-[var(--color-ink-muted)] italic"> or browse</span>
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            pdf · txt · ≤ 10 mb
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-[var(--color-accent)] font-medium rise">{error}</p>
      )}
    </div>
  );
}
