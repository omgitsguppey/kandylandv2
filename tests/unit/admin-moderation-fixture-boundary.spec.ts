import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const consoleSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationConsole.tsx"), "utf8");
const alertsSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationSecurityAlerts.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminModerationRealtime.ts"), "utf8");

describe("admin moderation fixture boundary", () => {
  it("labels local admin UI fixture moderation evidence as source_missing", () => {
    expect(consoleSource).toContain('data-admin-moderation-fixture-boundary="true"');
    expect(consoleSource).toContain('data-admin-moderation-fixture-state="source_missing"');
    expect(consoleSource).toContain("Moderation evidence is source_missing in local review");
    expect(consoleSource).toContain("thread transcripts, risk alerts, media evidence, and security-event samples");
    expect(consoleSource).toContain('className="flex flex-wrap gap-1.5 pb-1 sm:gap-2"');
    expect(consoleSource).not.toContain('className="flex gap-2 overflow-x-auto pb-1"');
    expect(consoleSource).toContain('data-moderation-truth-state={isLocalFixtureSourceMissing ? "source_missing"');
  });

  it("skips moderation route reads and Firestore listeners in fixture mode", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('"local_fixture_source_missing"');
    expect(hookSource).toContain('adminSessionState === "local_fixture_source_missing"');
    expect(hookSource).toContain("setThreads([])");
    expect(hookSource).toContain("setRawAlerts([])");
    expect(hookSource).toContain("setMessages([])");

    const fixtureBranch = hookSource.indexOf('adminSessionState === "local_fixture_source_missing"');
    const routeFetch = hookSource.indexOf('fetchAdminModerationJson<AdminModerationThreadsResponse>("/api/admin/moderation/threads")');
    const firstListener = hookSource.indexOf("onSnapshot(q, (snapshot)");

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(routeFetch).toBeGreaterThan(fixtureBranch);
    expect(firstListener).toBeGreaterThan(fixtureBranch);
  });

  it("distinguishes fixture source-missing from a healthy empty alert queue", () => {
    expect(alertsSource).toContain('"local_fixture_source_missing"');
    expect(alertsSource).toContain("Risk alert evidence is source_missing in local review.");
    expect(alertsSource).toContain("No risk-alert evidence is loaded for local review.");
    expect(consoleSource).toContain("Moderation threads are source_missing in local review.");
    expect(consoleSource).toContain("No moderation thread evidence is loaded for local review.");
  });
});
