import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/TransactionHistoryPanel.tsx"), "utf8");

describe("admin transaction history error language", () => {
  it("keeps visible transaction history failures on safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain("getAdminTransactionHistorySafeErrorMessage(error)");
    expect(source).not.toContain("setError(error instanceof Error ? error.message");
  });
});
