import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const queueSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminSupportQueue.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminSupportRealtime.ts"), "utf8");

describe("admin support fixture boundary", () => {
  it("labels local admin UI fixture support evidence as source_missing, not API verified", () => {
    expect(queueSource).toContain("isAdminUiTestSessionUser(user)");
    expect(queueSource).toContain('data-admin-support-fixture-boundary="true"');
    expect(queueSource).toContain("Support queue layout is inspectable");
    expect(queueSource).toContain("thread reads, replies, and status changes require real admin auth");
    expect(queueSource).toContain('{isLocalAdminUiTestSession ? "source_missing" : "API Verified"}');
  });

  it("disables admin support route reads while fixture mode is active", () => {
    expect(queueSource).toContain("useAdminSupportRealtime(selectedThreadId, { enabled: !isLocalAdminUiTestSession })");
    expect(hookSource).toContain("options: { enabled?: boolean } = {}");
    expect(hookSource).toContain("const enabled = options.enabled !== false");
    expect(hookSource).toContain("if (!enabled)");
    expect(hookSource).toContain("setThreads([])");
    expect(hookSource).toContain("setMessages([])");
  });
});
