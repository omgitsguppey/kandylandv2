import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/debug/page.tsx"), "utf8");
const realtimeHookSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/hooks/useAdminDebugRealtime.ts"),
  "utf8",
);
const aiRealtimeHookSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts"),
  "utf8",
);
const nowTabSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/components/DebugTabNow.tsx"),
  "utf8",
);
const controlTowerSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/components/DebugControlTower.tsx"),
  "utf8",
);

describe("admin debug local fixture boundary", () => {
  it("labels local admin UI fixture debug evidence as source_missing", () => {
    expect(pageSource).toContain("isAdminUiTestSessionUser(user)");
    expect(pageSource).toContain('data-admin-debug-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-debug-fixture-state="source_missing"');
    expect(pageSource).toContain("The Debug Console layout is inspectable");
    expect(pageSource).toContain("route checks, realtime evidence,");
    expect(pageSource).toContain("toLocalFixtureSummaryItem");
    expect(pageSource).toContain("toLocalFixtureDetailItem");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? items.map(toLocalFixtureSummaryItem) : items");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? items.map(toLocalFixtureDetailItem) : items");
    expect(pageSource).toContain('className="flex w-full flex-wrap items-center gap-2 pb-2"');
    expect(pageSource).not.toContain("overflow-x-auto pb-2 scrollbar-hide");
    expect(pageSource).toContain("Waiting for verified");
    expect(pageSource).toContain("Local review checks layout and controls only; it does not load verified admin evidence.");
    expect(pageSource).toContain("local_fixture_source_missing");
    expect(controlTowerSource).toContain("Waiting for verified source");
    expect(controlTowerSource).toContain("waiting for verified debug evidence");
  });

  it("skips debug route reads and realtime listeners in fixture mode", () => {
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug"');
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/preferences"');
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/assistant"');
    expect(pageSource).toContain("useAdminDebugRealtime({ enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("useAdminAiAssistantRealtime(aiDebugData, { enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("useAdminOverview({ enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("isLocalAdminUiTestSession={isLocalAdminUiTestSession}");
    expect(realtimeHookSource).toContain("useAdminDebugRealtime(options: { enabled?: boolean } = {})");
    expect(realtimeHookSource).toContain("if (!enabled) {");
    expect(aiRealtimeHookSource).toContain("options: { enabled?: boolean } = {}");
    expect(aiRealtimeHookSource).toContain("if (!enabled) {");
    expect(nowTabSource).toContain("isLocalAdminUiTestSession?: boolean");
    expect(controlTowerSource).toContain("isLocalAdminUiTestSession = false");
    expect(controlTowerSource).toContain('data-admin-debug-control-tower-fixture-boundary="true"');
  });

  it("guards debug mutations and protected balance adjustments behind real admin sessions", () => {
    expect(pageSource).toContain("Debug preferences are source_missing in local UI review.");
    expect(pageSource).toContain("Debug evidence is source_missing in local UI review.");
    expect(pageSource).toContain("Balance adjustments require a real admin session.");
    expect(pageSource).toContain("Repair actions require a real admin session.");
    expect(pageSource).toContain("AI debug settings are source_missing in local UI review.");
    expect(pageSource).toContain("Live AI debug guidance requires a real admin session.");
  });
});
