import { describe, it, expect } from "vitest";
import { chunkText } from "../lib/ingest";

describe("chunkText", () => {
  it("splits long text into chunks under chunkSize with overlap", async () => {
    const text = "abcdefghij ".repeat(500); // ~5500 chars
    const chunks = await chunkText(text, "doc.txt", "sess1", "doc1");
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.pageContent.length).toBeLessThanOrEqual(1000);
      expect(c.metadata.sessionId).toBe("sess1");
      expect(c.metadata.docId).toBe("doc1");
      expect(c.metadata.fileName).toBe("doc.txt");
      expect(c.metadata.page).toBeNull();
    }
  });

  it("assigns sequential chunkIndex", async () => {
    const text = "x".repeat(3000);
    const chunks = await chunkText(text, "f.txt", "s", "d");
    chunks.forEach((c, i) => expect(c.metadata.chunkIndex).toBe(i));
  });
});
