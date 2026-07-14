import { describe, expect, it } from "vitest";

import { shouldSyncAgentSqlMirrorDuringCheck } from "../../scripts/agent/check-agent-context";
import { assertSqlMirrorSyncAllowed, inferRows, syncAgentSqlMirror } from "../../scripts/agent/sync-sql";
import { validateCloudSqlGeminiCostGuards } from "../../scripts/agent/validate-cloud-sql-gemini-cost-guards";

describe("cloud sql and gemini cost guards", () => {
  it("fails SQL mirror sync without explicit approval", () => {
    expect(() => assertSqlMirrorSyncAllowed({})).toThrow(/ALLOW_SQL_MIRROR_SYNC=1/u);
  });

  it("fails SQL mirror sync without a reason", () => {
    expect(() => assertSqlMirrorSyncAllowed({
      ALLOW_SQL_MIRROR_SYNC: "1",
      SQL_MIRROR_SYNC_ENV: "local",
    })).toThrow(/SQL_MIRROR_SYNC_REASON/u);
  });

  it("dry-run mode does not execute provider or write artifacts", () => {
    const result = syncAgentSqlMirror({
      env: {
        ALLOW_SQL_MIRROR_SYNC: "1",
        SQL_MIRROR_SYNC_REASON: "unit test dry run",
        SQL_MIRROR_SYNC_ENV: "local",
        SQL_MIRROR_DRY_RUN: "1",
      },
      now: () => "2026-05-19T00:00:00.000Z",
    });

    expect(result.guard.dryRun).toBe(true);
    expect(result.guard.providerExecution).toBe("blocked_local_dry_run");
    expect(result.writesSkipped).toBe(true);
  });

  it("keeps agent context checks source-safe unless SQL mirror sync is explicitly approved", () => {
    expect(shouldSyncAgentSqlMirrorDuringCheck({})).toBe(false);
    expect(shouldSyncAgentSqlMirrorDuringCheck({ ALLOW_SQL_MIRROR_SYNC: "0" })).toBe(false);
    expect(shouldSyncAgentSqlMirrorDuringCheck({ ALLOW_SQL_MIRROR_SYNC: "1" })).toBe(true);
  });

  it("preserves logical full counts when compact index artifacts are mirrored", () => {
    expect(inferRows("repo-inventory.json", {
      totalFindingCount: 4_914,
      items: [{}, {}],
    })).toBe(4_914);
    expect(inferRows("verification-commands.json", {
      counts: { total: 905, emitted: 12, omitted: 893 },
      commands: [{}],
    })).toBe(905);
  });

  it("lists runtime SQL detection separately from Data Connect mirror config", () => {
    const report = validateCloudSqlGeminiCostGuards({ writeReport: false });

    expect(report.summary.cloudSqlRuntimeDetected).toBe(false);
    expect(report.summary.dataConnectRuntimeDetected).toBe(false);
    expect(report.dataConnectFindings.some((finding) => finding.status.includes("agent_context_mirror"))).toBe(true);
  });

  it("keeps Cloud SQL external billing as owner review when no runtime source is detected", () => {
    const report = validateCloudSqlGeminiCostGuards({ writeReport: false });

    expect(report.summary.cloudSqlExternalBillingObserved).toBe(true);
    expect(JSON.stringify(report.deferredOwnerReview)).toContain("cloud_sql_external_billing_observed_owner_review_required");
    expect(JSON.stringify(report.sqlFindings)).not.toContain("pass");
  });

  it("requires explicit admin action guards for detected Gemini runtime calls", () => {
    const report = validateCloudSqlGeminiCostGuards({ writeReport: false });

    expect(report.summary.geminiRuntimeDetected).toBe(true);
    expect(report.summary.aiCallsRequireExplicitAction).toBe(true);
    expect(report.summary.aiCallsHaveRateOrCacheGuard).toBe(true);
  });

  it("keeps Gemini external billing as owner review when source is uncertain", () => {
    const report = validateCloudSqlGeminiCostGuards({ writeReport: false });

    expect(report.summary.geminiExternalBillingObserved).toBe(true);
    expect(JSON.stringify(report.deferredOwnerReview)).toContain("gemini_cloud_assist_external_billing_observed_owner_review_required");
    expect(report.nextFixOrder.length).toBeGreaterThan(0);
  });
});
