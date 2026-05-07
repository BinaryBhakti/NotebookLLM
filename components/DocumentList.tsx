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
    return <p className="text-xs text-gray-500 px-2">No documents uploaded yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {documents.map(d => (
        <li
          key={d.docId}
          className="flex items-center justify-between bg-white rounded px-2 py-1 text-sm"
        >
          <span className="truncate" title={d.fileName}>
            {d.fileName} <span className="text-gray-400">({d.chunkCount})</span>
          </span>
          <button
            onClick={() => onDelete(d.docId)}
            className="text-xs text-red-600 hover:underline ml-2"
          >
            remove
          </button>
        </li>
      ))}
    </ul>
  );
}
