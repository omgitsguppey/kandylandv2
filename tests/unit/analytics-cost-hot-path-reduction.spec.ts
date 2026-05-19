import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function readRepoFile(filePath: string) {
  return readFileSync(path.join(root, filePath), "utf8");
}

describe("analytics cost hot path reduction", () => {
  it("keeps BigQuery export out of per-event claim transactions and uses watermark batching", () => {
    const source = readRepoFile("functions/src/analytics-bigquery-export.ts");

    expect(source).toContain("shouldAttemptBigQueryExportClaim");
    expect(source).toContain("buildBigQueryExportWatermarkWindow");
    expect(source).toContain("exportBigQueryRawEventsBatch");
    expect(source).toContain("FieldPath.documentId()");
    expect(source).toContain("startAfter(input.windowStartMs, input.watermarkEventId)");
    expect(source).not.toMatch(/const claimedExportWindow\s*=\s*await claimBigQueryExportWindow/u);
    expect(source).toMatch(/maximumBytesBilledRequiredForQueries:\s*true/u);
    expect(source).toMatch(/partitionFilterRequired:\s*true/u);
  });

  it("does not run user tracking materialization in analytics ingest hot path", () => {
    const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

    expect(source).toContain("queueUserTrackingMaterialization");
    expect(source).not.toMatch(/await materializeUserTrackingIndexes\(/u);
  });

  it("returns calm non-retryable responses for permanent ingest validation failures", () => {
    const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

    expect(source).toContain("invalid_analytics_payload");
    expect(source).toContain("retryable: false");
    expect(source).toMatch(/status:\s*422/u);
  });

  it("moves non-critical realtime summary off one-minute cadence", () => {
    const source = readRepoFile("functions/src/analytics-realtime-summary.ts");

    expect(source).toContain("REALTIME_SUMMARY_MIN_CADENCE_MS");
    expect(source).toContain("shouldRunRealtimeSummaryRefresh");
    expect(source).not.toContain('schedule: "every 1 minutes"');
  });

  it("uses stale-known cache defaults for admin historical analytics", () => {
    const source = readRepoFile("src/app/api/admin/analytics/historical/route.ts");

    expect(source).toContain("ADMIN_ANALYTICS_HISTORICAL_RESPONSE_CACHE_TTL_MS = ANALYTICS_NON_PRIORITY_TTL_MS");
    expect(source).toContain("sourceFreshness");
    expect(source).toContain("cacheAgeMs");
    expect(source).not.toContain('fetchCache = "force-no-store"');
  });

  it("reduces admin debug initial load with a cost guard marker", () => {
    const source = readRepoFile("src/app/api/admin/debug/route.ts");

    expect(source).toContain("ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD");
    expect(source).toContain("debug_cost_reduced_initial_summary");
  });

  it("does not scan the full queue heartbeat collection by default", () => {
    const source = readRepoFile("src/lib/server/runtime-warning-store.ts");

    expect(source).toContain("QUEUE_JOB_HEARTBEAT_DEFAULT_LIMIT");
    expect(source).toMatch(/orderBy\("updatedAt",\s*"desc"\)\s*\.\s*limit\(limitCount\)/u);
    expect(source).not.toMatch(/collection\(QUEUE_JOB_HEARTBEAT_COLLECTION\)\.get\(\)/u);
  });

  it("keeps cost savings as percentages rather than fake dollars", () => {
    const reportSource = readRepoFile("agent/state/analytics-cost-hot-path-reduction.generated.json");

    expect(reportSource).toContain('"reportKey": "analytics-cost-hot-path-reduction"');
    expect(reportSource).toContain("80% fewer");
    expect(reportSource).not.toMatch(/\$\d/u);
  });
});
