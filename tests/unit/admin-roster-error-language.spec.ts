import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/roster/page.tsx"), "utf8");

describe("admin roster error language", () => {
  it("routes visible creator roster failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminRosterSafeErrorMessage(error");
    expect(source).not.toContain("toast.error(error instanceof Error ? error.message");
  });
});
