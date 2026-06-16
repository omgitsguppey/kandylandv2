import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/users/page.tsx"), "utf8");

describe("admin users error language", () => {
  it("routes visible admin users failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminUsersSafeErrorMessage(error");
    expect(source).not.toContain("error instanceof Error ? error.message");
    expect(source).not.toMatch(/toast\.error\(error\.message/u);
  });
});
