import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/ai/page.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "src/app/admin/ai/hooks/useAdminAiState.tsx"), "utf8");
const descriptionSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminAiDescriptionOperations.tsx"), "utf8");

describe("admin AI local fixture boundary", () => {
  it("labels Cover Ops as no-source instead of live admin AI evidence in local fixture mode", () => {
    expect(pageSource).toContain("data-admin-ai-fixture-boundary=\"true\"");
    expect(pageSource).toContain("No verified Cover Ops source is loaded in this local review");
    expect(pageSource).toContain("reading runtime evidence, uploading references, changing settings, or reviewing generations");
    expect(pageSource).toContain('state.data?.runtime.status || (state.isLoading ? "Loading" : ADMIN_AI_NO_SOURCE_VALUE)');
    expect(pageSource).toContain('className="flex flex-wrap gap-1"');
    expect(pageSource).not.toContain("min-w-max");
    expect(pageSource).toContain("disabled={state.isLocalAdminUiTestSession}");
  });

  it("skips admin AI cover reads and writes for local fixture sessions", () => {
    expect(hookSource).toContain("isAdminUiTestSessionUser(user)");
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ai/drop-covers"');
    expect(hookSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ui/preferences"');
    expect(hookSource).toContain("No verified Cover Ops source is loaded in local review");
    expect(hookSource).toContain("Reference uploads require a real admin session");
    expect(hookSource).toContain("Review gallery updates require a real admin session");
  });

  it("skips nested description operations reads and writes for local fixture sessions", () => {
    expect(descriptionSource).toContain("data-admin-ai-description-fixture-boundary=\"true\"");
    expect(descriptionSource).toContain("Description operations have no verified source until a real admin session loads AI evidence");
    expect(descriptionSource).toContain("formatSnapshotUsd(data?.aggregate.totalEstimatedCostUsd, hasDashboardSnapshot)");
    expect(descriptionSource).toContain("No cost source loaded");
    expect(descriptionSource).not.toContain("formatAdminAiUsd(data?.aggregate.totalEstimatedCostUsd || 0)");
    expect(descriptionSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/ai/drop-descriptions"');
    expect(descriptionSource).toContain("Description operations require a real admin session");
    expect(descriptionSource).toContain("Description prompt changes require a real admin session");
    expect(descriptionSource).toContain("Description feedback requires a real admin session");
  });
});
