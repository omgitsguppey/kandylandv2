import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationConsole.tsx"), "utf8");

describe("admin moderation console UI truth", () => {
  it("labels disabled future moderation actions as unavailable instead of implementation noise", () => {
    expect(source).not.toContain("not_implemented");
    expect(source).toContain('data-moderation-action-state="unavailable"');
    expect(source).toContain("Restrict account unavailable");
    expect(source).toContain("Disable file access unavailable");
  });
});
