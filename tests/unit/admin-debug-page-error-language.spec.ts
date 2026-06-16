import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/debug/page.tsx"), "utf8");

describe("admin debug page error language", () => {
  it("routes non-protected visible debug preference and AI failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminDebugSafeErrorMessage(preferenceError");
    expect(source).toContain("getAdminDebugSafeErrorMessage(issue, \"AI assistant settings update failed\")");
    expect(source).toContain("getAdminDebugSafeErrorMessage(issue, \"Failed to generate live AI guidance.\")");
    expect(source).not.toContain("toast.error(preferenceError instanceof Error ? preferenceError.message");
    expect(source).not.toContain("toast.error(issue instanceof Error ? issue.message : \"AI assistant settings update failed\")");
    expect(source).not.toContain("toast.error(issue instanceof Error ? issue.message : \"Failed to generate live AI guidance.\")");
  });

  it("leaves protected balance and repair action lanes isolated for separate review", () => {
    expect(source).toContain("toast.error(issue instanceof Error ? issue.message : \"Balance adjustment failed\")");
    expect(source).toContain("toast.error(issue instanceof Error ? issue.message : \"Repair action failed\")");
  });
});
