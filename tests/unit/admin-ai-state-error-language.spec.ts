import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/ai/hooks/useAdminAiState.tsx"), "utf8");

describe("admin AI state error language", () => {
  it("routes visible Admin AI mutation failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminAiStateSafeErrorMessage(issue");
    expect(source).not.toContain("toast.error(issue instanceof Error ? issue.message");
  });
});
