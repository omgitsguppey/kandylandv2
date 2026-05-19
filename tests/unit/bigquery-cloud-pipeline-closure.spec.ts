import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  BIGQUERY_EXPORT_CONTRACT,
  buildBigQueryExportEvidenceState,
  resolveBigQueryExportStatus,
  shouldRunBigQueryExportWindow,
  validateBigQueryExportContractClosure,
} from "@/lib/analytics/bigquery-export-contract";
import { listBigQueryExportCandidates } from "@/lib/analytics/materialization-contract";

const repoRoot = path.resolve(__dirname, "../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("BigQuery cloud pipeline closure", () => {
  it("classifies missing BigQuery configuration as unavailable evidence, not zero traffic", () => {
    const status = resolveBigQueryExportStatus({});
    const evidence = buildBigQueryExportEvidenceState({ env: {}, firstPartySummariesActive: true });

    expect(status).toBe("config_missing");
    expect(evidence).toMatchObject({
      status: "config_missing",
      evidenceOnly: true,
      primaryProductTruth: false,
      trafficInterpretation: "unavailable_not_zero",
      productAnalyticsFailure: false,
    });
  });

  it("defines a daily batched export contract with watermarks, TTLs, and cost guards", () => {
    expect(BIGQUERY_EXPORT_CONTRACT.sourceCollection).toBe("analytics_event_facts");
    expect(BIGQUERY_EXPORT_CONTRACT.watermark.collection).toBe("analytics_export_status");
    expect(BIGQUERY_EXPORT_CONTRACT.batch.maxRows).toBeGreaterThan(0);
    expect(BIGQUERY_EXPORT_CONTRACT.cadence.kind).toBe("daily_windowed");
    expect(BIGQUERY_EXPORT_CONTRACT.retry.failureTtlMs).toBeGreaterThan(0);
    expect(BIGQUERY_EXPORT_CONTRACT.queryCostGuards).toMatchObject({
      dryRunRequiredForQueries: true,
      maximumBytesBilledRequiredForQueries: true,
      partitionFilterRequired: true,
    });
    expect(BIGQUERY_EXPORT_CONTRACT.successSemantics.claimsExportedOnlyAfterInsert).toBe(true);
  });

  it("allows explicit due scheduled windows but blocks per-event export claims", () => {
    const nowMs = Date.UTC(2026, 4, 19, 4, 0, 0);

    expect(shouldRunBigQueryExportWindow({
      trigger: "scheduled",
      nowMs,
      lastRunAtMs: nowMs - BIGQUERY_EXPORT_CONTRACT.cadence.minCadenceMs - 1,
      configPresent: true,
    })).toMatchObject({ shouldRun: true, reason: "scheduled_window_due" });

    expect(shouldRunBigQueryExportWindow({
      trigger: "event",
      nowMs,
      lastRunAtMs: 0,
      configPresent: true,
    })).toMatchObject({ shouldRun: false, reason: "event_trigger_disabled" });
  });

  it("keeps event facts export-eligible without treating BigQuery as product truth", () => {
    expect(listBigQueryExportCandidates()).toContain("analytics_event_facts");
    expect(BIGQUERY_EXPORT_CONTRACT.truthClass).toBe("analytics_evidence_only");
    expect(BIGQUERY_EXPORT_CONTRACT.primaryProductTruth).toBe(false);
    expect(BIGQUERY_EXPORT_CONTRACT.missingConfigTrafficBehavior).toBe("unavailable_not_zero");
  });

  it("exports the scheduled function and does not expose an event-triggered export claim path", () => {
    const functionsIndex = readRepoFile("functions/src/index.ts");
    const bigQueryExportSource = readRepoFile("functions/src/analytics-bigquery-export.ts");

    expect(functionsIndex).toContain("scheduledBigQueryRawEventsExport");
    expect(functionsIndex).not.toContain("onAnalyticsEventFactBigQueryExport");
    expect(bigQueryExportSource).not.toContain("onDocumentCreated");
    expect(bigQueryExportSource).not.toContain("onAnalyticsEventFactBigQueryExport");
  });

  it("validates the BigQuery export closure contract", () => {
    const result = validateBigQueryExportContractClosure();

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
