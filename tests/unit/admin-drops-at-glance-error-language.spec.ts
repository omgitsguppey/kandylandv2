import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminDropsAtGlancePanel.tsx"), "utf8");

describe("admin drops at glance error language", () => {
  it("maps queue update failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminDropsAtGlanceSafeErrorMessage(error");
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});
