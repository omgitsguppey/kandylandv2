import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminCreatorViewAsControls.tsx"), "utf8");

describe("admin creator view-as error language", () => {
  it("maps view-as start failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminViewAsSafeErrorMessage(error)");
    expect(source).not.toContain("error instanceof Error ? error.message");
  });
});
