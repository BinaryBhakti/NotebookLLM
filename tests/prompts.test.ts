import { describe, it, expect } from "vitest";
import { buildSystemPrompt, NOT_FOUND_MESSAGE } from "../lib/prompts";

describe("buildSystemPrompt", () => {
  it("includes the strict grounding rules", () => {
    const p = buildSystemPrompt("CTX");
    expect(p).toMatch(/ONLY/);
    expect(p).toMatch(/I couldn't find this in the uploaded document/);
    expect(p).toMatch(/CTX/);
  });

  it("exports the not-found phrase verbatim", () => {
    expect(NOT_FOUND_MESSAGE).toBe("I couldn't find this in the uploaded document(s).");
  });
});
