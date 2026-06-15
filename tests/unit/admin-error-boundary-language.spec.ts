import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/error.tsx"), "utf8");

describe("admin error boundary language", () => {
  it("renders canonical safe error language instead of raw exception text", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('data-admin-error-safe-message="true"');
    expect(source).toContain('data-admin-error-digest="true"');
    expect(source).not.toMatch(/>\s*\{\s*error\.message/u);
    expect(source).not.toContain("Error details unavailable");
  });
});
