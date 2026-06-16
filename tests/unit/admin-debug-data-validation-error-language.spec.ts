import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx"), "utf8");

describe("admin debug data validation error language", () => {
  it("sanitizes validation route load errors before panel state renders them", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_debug"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminValidationSafeErrorMessage(error)");
    expect(source).not.toContain("loadError: error instanceof Error ? error.message");
  });
});
