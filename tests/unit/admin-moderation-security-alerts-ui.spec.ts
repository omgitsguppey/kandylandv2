import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationSecurityAlerts.tsx"), "utf8");

describe("admin moderation security alerts UI truth", () => {
  it("renders failed alert-list sources through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-moderation-alerts-safe-error="true"');
    expect(source).not.toContain("{error.message}");
  });
});
