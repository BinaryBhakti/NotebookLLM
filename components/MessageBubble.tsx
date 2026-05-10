"use client";
import { useState } from "react";
import type { Citation } from "@/lib/types";

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export function MessageBubble({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end rise">
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-[var(--color-ink)] text-[var(--color-paper)] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start rise">
      <div className="max-w-[82%] flex gap-3">
        <div
          className="shrink-0 mt-1 h-6 w-6 rounded-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center font-[family-name:var(--font-display)] text-[12px] text-[var(--color-ink-soft)]"
          aria-hidden
        >
          n
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] leading-[1.65] text-[var(--color-ink)] whitespace-pre-wrap">
            {message.content}
          </div>

          {message.citations && message.citations.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                <span
                  className={`inline-block h-px w-3 bg-current transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                />
                {open ? "Hide" : "Show"} sources · {message.citations.length}
              </button>

              {open && (
                <ul className="mt-3 space-y-2.5">
                  {message.citations.map((c, i) => (
                    <li
                      key={i}
                      className="rise rounded-md bg-[var(--color-card)] border border-[var(--color-rule-soft)] px-3 py-2.5"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <div className="font-[family-name:var(--font-display)] text-[12.5px] text-[var(--color-ink)] truncate">
                          {c.fileName}
                        </div>
                        {c.page != null && (
                          <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-faint)] shrink-0">
                            p.{c.page}
                          </div>
                        )}
                      </div>
                      <div className="text-[12.5px] leading-[1.55] text-[var(--color-ink-soft)]">
                        {c.snippet}…
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
