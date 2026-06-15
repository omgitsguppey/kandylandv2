import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/ai/page.tsx"), "utf8");

describe("admin AI page error language", () => {
  it("renders load failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-admin-ai-safe-error="true"');
    expect(source).not.toContain("state.error.message");
    expect(source).not.toContain("Error details unavailable");
  });
});
