import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationConsole.tsx"), "utf8");

describe("admin moderation console UI truth", () => {
  it("replaces unavailable future moderation actions with a plain source-state note", () => {
    expect(source).toContain('data-moderation-action-state="not_configured"');
    expect(source).toContain("Account restrictions and file access blocks need a connected admin action source");
    expect(source).not.toMatch(/data-moderation-action-state="not_implemented"|Restrict account needs admin wiring|Disable file access needs admin wiring/u);
  });

  it("routes default moderation route failures through safe error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).not.toContain("${route} failed: ${error.message}");
  });
});
