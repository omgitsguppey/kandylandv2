import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const consoleSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationConsole.tsx"), "utf8");
const alertsSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminModerationSecurityAlerts.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/hooks/useAdminModerationRealtime.ts"), "utf8");

describe("admin moderation fixture boundary", () => {
  it("labels local admin UI fixture moderation evidence as no-source", () => {
    expect(consoleSource).toContain('data-admin-moderation-fixture-boundary="true"');
    expect(consoleSource).toContain('data-admin-moderation-fixture-state="source_missing"');
    expect(consoleSource).toContain("source_missing: moderation source is not loaded in this fixture");
    expect(consoleSource).toContain("Protected evidence reads stay blocked until verified admin access provides the source");
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
    expect(alertsSource).toContain("source_missing: risk-alert source is not loaded in this fixture.");
    expect(alertsSource).toContain("source_missing: risk-alert evidence is not loaded in this fixture.");
    expect(consoleSource).toContain("source_missing: moderation thread source is not loaded in this fixture.");
    expect(consoleSource).toContain("source_missing: moderation thread evidence is not loaded in this fixture.");
  });
});
