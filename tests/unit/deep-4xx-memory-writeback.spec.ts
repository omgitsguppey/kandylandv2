import { describe, expect, it } from "vitest";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("deep 4xx memory writeback", () => {
  it("records stale-link, client callsite, bot, auth drift, and cheap expected 4xx lessons", () => {
    const repoMemory = [
      readFileSync("AGENTS.md", "utf8"),
      readFileSync("REPO_MEMORY_LEDGER.md", "utf8"),
      readFileSync("agent/index/known-pitfalls.json", "utf8"),
    ].join("\n");
    const externalNotesDir = join(process.env.USERPROFILE || "", ".codex", "memories", "extensions", "ad_hoc", "notes");
    const externalMemory = existsSync(externalNotesDir)
      ? "deep-4xx-route-map"
      : "";
    const memory = `${repoMemory}\n${externalMemory}`;

    expect(memory).toContain("Search for 4xx by route behavior, not just status-code strings.");
    expect(memory).toContain("Every 4xx must have a root-cause class");
    expect(memory).toContain("check both sides: the API route and the client surface/link/deep link");
    expect(memory).toContain("Expected 4xx should be cheap, grouped, non-retryable, and user-readable");
    expect(memory).toContain("deleted, expired, private, or unavailable content");
  });
});
