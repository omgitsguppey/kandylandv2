import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/AdminPrivacyPreflight.tsx"), "utf8");

describe("admin privacy preflight error language", () => {
  it("renders canonical safe error language instead of raw hook errors", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-privacy-console-safe-error="true"');
    expect(source).not.toContain("{error.message}");
  });
});
