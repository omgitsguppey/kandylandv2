import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/content/page.tsx"), "utf8");

describe("admin content manager error language", () => {
  it("renders content failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-admin-content-safe-error="true"');
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});

