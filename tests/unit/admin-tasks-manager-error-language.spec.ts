import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminTasksManager.tsx"), "utf8");

describe("admin tasks manager error language", () => {
  it("maps create and update failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('getAdminTaskSafeErrorMessage(error, "Task creation failed")');
    expect(source).toContain('getAdminTaskSafeErrorMessage(error, "Task update failed")');
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});
