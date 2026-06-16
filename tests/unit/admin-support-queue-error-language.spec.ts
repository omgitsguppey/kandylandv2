import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminSupportQueue.tsx"), "utf8");

describe("admin support queue error language", () => {
  it("maps support load, reply, and status failures through safe admin error language", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")');
    expect(source).toContain('getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")');
    expect(source).toContain('getAdminSupportSafeErrorMessage(error, "Support reply failed.")');
    expect(source).toContain('getAdminSupportSafeErrorMessage(error, "Support status update failed.")');
    expect(source).not.toContain("error instanceof Error ? error.message");
    expect(source).not.toContain("{threadsError.message}");
    expect(source).not.toContain("{messagesError.message}");
  });
});
