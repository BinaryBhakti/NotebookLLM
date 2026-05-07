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
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
        }`}
      >
        <div>{message.content}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 text-xs">
            <button
              onClick={() => setOpen(!open)}
              className="underline text-gray-600"
            >
              {open ? "Hide" : "Show"} sources ({message.citations.length})
            </button>
            {open && (
              <ul className="mt-1 space-y-1">
                {message.citations.map((c, i) => (
                  <li key={i} className="border-l-2 border-gray-300 pl-2 text-gray-700">
                    <div className="font-mono text-[10px] text-gray-500">
                      {c.fileName}
                      {c.page != null ? ` · p.${c.page}` : ""}
                    </div>
                    <div>{c.snippet}…</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
