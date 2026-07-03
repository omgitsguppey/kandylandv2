import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/ai/page.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/app/admin/ai/hooks/useAdminAiState.tsx"), "utf8");
const descriptionSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminAiDescriptionOperations.tsx"), "utf8");
const runtimeSource = readFileSync(join(process.cwd(), "src/app/admin/ai/components/AdminAiRuntimestripSection.tsx"), "utf8");
const recentSource = readFileSync(join(process.cwd(), "src/app/admin/ai/components/AdminAiRecentgenerationsSection.tsx"), "utf8");

describe("admin AI local fixture boundary", () => {
  it("labels Cover Ops as no-source instead of live admin AI evidence in local fixture mode", () => {
    expect(pageSource).toContain("data-admin-ai-fixture-boundary=\"true\"");
    expect(pageSource).toContain("source_missing: Cover Ops source is not loaded in this fixture");
    expect(pageSource).toContain("Protected reads and writes stay blocked until verified admin access provides the source");
    expect(pageSource).toContain('state.data?.runtime.status || (state.isLoading ? "Loading" : ADMIN_AI_NO_SOURCE_VALUE)');
    expect(pageSource).toContain('className="flex flex-wrap gap-1"');
    expect(pageSource).not.toContain("min-w-max");
    expect(pageSource).toContain("disabled={state.isLocalAdminUiTestSession}");
    expect(runtimeSource).toContain("No model health source loaded yet.");
    expect(runtimeSource).toContain("No preflight source loaded yet.");
    expect(recentSource).toContain('title="No generation job source"');
    expect(`${runtimeSource}\n${recentSource}`).not.toContain(" • ");
  });

  it("skips admin AI cover reads and writes for local fixture sessions", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ai/drop-covers"');
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ui/preferences"');
    expect(hookSource).toContain("source_missing: Cover Ops source is not loaded in this fixture");
    expect(hookSource).toContain("permission_blocked: reference uploads require verified admin access");
    expect(hookSource).toContain("permission_blocked: review gallery updates require verified admin access");
  });

  it("skips nested description operations reads and writes for local fixture sessions", () => {
    expect(descriptionSource).toContain("data-admin-ai-description-fixture-boundary=\"true\"");
    expect(descriptionSource).toContain("source_missing: description operations source is not loaded in this fixture");
    expect(descriptionSource).toContain("formatSnapshotUsd(data?.aggregate.totalEstimatedCostUsd, hasDashboardSnapshot)");
    expect(descriptionSource).toContain("No cost source loaded");
    expect(descriptionSource).not.toContain("formatAdminAiUsd(data?.aggregate.totalEstimatedCostUsd || 0)");
    expect(descriptionSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ai/drop-descriptions"');
    expect(descriptionSource).toContain("permission_blocked: description operations require verified admin access");
    expect(descriptionSource).toContain("permission_blocked: description prompt changes require verified admin access");
    expect(descriptionSource).toContain("permission_blocked: description feedback requires verified admin access");
  });
});
