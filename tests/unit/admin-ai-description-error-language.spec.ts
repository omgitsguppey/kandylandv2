import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminAiDescriptionOperations.tsx"), "utf8");

describe("admin AI description operations error language", () => {
  it("renders load and action failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-admin-ai-description-safe-error="true"');
    expect(source).toContain("getAdminAiDescriptionSafeErrorMessage(issue");
    expect(source).not.toContain('error instanceof Error ? error.message : "Failed to load description AI operations."');
    expect(source).not.toContain("issue instanceof Error ? issue.message");
  });
});
