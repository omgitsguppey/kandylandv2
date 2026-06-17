import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationConsole.tsx"), "utf8");

describe("admin moderation console UI truth", () => {
  it("labels disabled future moderation actions as needing wiring while keeping a source-state marker", () => {
    expect(source).toContain('data-moderation-action-state="not_implemented"');
    expect(source).toContain("Restrict account needs admin wiring");
    expect(source).toContain("Disable file access needs admin wiring");
  });

  it("routes default moderation route failures through safe error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).not.toContain("${route} failed: ${error.message}");
  });
});
