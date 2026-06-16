import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");

describe("admin debug Control Tower error language", () => {
  it("routes visible Control Tower load failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).not.toContain("setError(issue instanceof Error ? issue.message");
  });
});
