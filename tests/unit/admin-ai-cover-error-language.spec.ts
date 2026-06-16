import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AiDropCoverGeneratorPanel.tsx"), "utf8");

describe("admin AI cover generator error language", () => {
  it("maps generation and feedback failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminAiCoverSafeErrorMessage(error");
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});
