import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/drops/page.tsx"), "utf8");

describe("admin drops error language", () => {
  it("routes visible drop moderation and queue failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminDropsSafeErrorMessage(error");
    expect(source).not.toMatch(/toast\.error\(error\.message/u);
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});
