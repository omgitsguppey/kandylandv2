import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/hooks/useAdminAnalyticsSnapshot.ts"), "utf8");

describe("admin analytics snapshot error language", () => {
  it("maps snapshot load and refresh errors through safe admin language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminAnalyticsSnapshotSafeErrorMessage(loadError");
    expect(source).toContain("getAdminAnalyticsSnapshotSafeErrorMessage(refreshError");
    expect(source).not.toContain("loadError instanceof Error ? loadError.message");
    expect(source).not.toContain("refreshError instanceof Error ? refreshError.message");
  });
});

