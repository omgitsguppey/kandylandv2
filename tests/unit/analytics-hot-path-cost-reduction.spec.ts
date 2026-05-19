import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");

function readRepoFile(relativePath: string) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("analytics hot path cost reduction guardrails", () => {
    it("keeps valid priority guest ingest accepted and stored", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).toContain("transaction.create(guestBatchRef");
        expect(source).toContain("events: sanitizedEvents");
        expect(source).toContain("processed: events.length");
        expect(source).toContain("success: true");
    });

    it("keeps priority ingest but removes non-priority hot path work", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).toContain("queueUserTrackingMaterialization");
        expect(source).toContain("queueBehavioralTimelineFacts");
        expect(source).toContain("materializeUserTrackingIndexes stays out of the priority-live request path");
        expect(source).not.toContain("writeBehavioralTimelineFacts(");
        expect(source).not.toContain("mapRuntimeFactToBehavioralTimelineFact");
    });

    it("returns non-retryable 4xx for permanent ingest failures", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).toContain('reason: "payload_too_large", retryable: false');
        expect(source).toContain("{ status: 413 }");
        expect(source).toContain('reason: "invalid_json", retryable: false');
        expect(source).toContain("{ status: 400 }");
        expect(source).toContain('reason, retryable: false');
        expect(source).toContain("{ status: 422 }");
    });

    it("suppresses high-volume consent diagnostics and caps warning fingerprints", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");
        const consentBlock = source.slice(
            source.indexOf("if (!requestAllowsAnonymousAnalytics(request))"),
            source.indexOf("let rawPayload: unknown;"),
        );

        expect(consentBlock).not.toContain("recordServerDiagnostic");
        expect(consentBlock).toContain("diagnosticPolicy");
        expect(source).toContain("shouldRecordAnalyticsIngestDiagnostic");
        expect(source).toContain("ANALYTICS_INGEST_WARNING_CAP_PER_HOUR");
        expect(source).toContain("ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR");
    });

    it("dedupes catch-path failures by fingerprint and hour", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).toContain("analyticsIngestFailureCounts");
        expect(source).toContain("cap: ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR");
        expect(source).toContain("fingerprint");
    });

    it("avoids reading guest session state on every flush", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).not.toContain("sessionSnapshot");
        expect(source).not.toContain("transaction.get(docRef)");
        expect(source).toContain("FieldValue.arrayUnion(...uniquePagePaths");
        expect(source).toContain("FieldValue.arrayUnion(...uniqueInteractionTypes");
    });

    it("uses deterministic event fact create instead of read-before-write dedupe", () => {
        const source = readRepoFile("functions/src/analytics-event-facts.ts");

        expect(source).toContain("await ref.create(finalEvent)");
        expect(source).not.toContain("const snapshot = await ref.get()");
        expect(source).not.toContain("const dedupeSnap = await dedupeRef.get()");
        expect(source).toContain("batch.create(dedupeRef");
    });

    it("defers low-priority event fact rollups into minute batches", () => {
        const source = readRepoFile("functions/src/analytics-event-facts.ts");

        expect(source).toContain("analytics_event_rollup_batches");
        expect(source).toContain("deferred_non_priority");
        expect(source).toContain("isPriorityEventFactForImmediateRollups");
    });

    it("keeps BigQuery export windowed and blocks repeated failure writes", () => {
        const source = readRepoFile("functions/src/analytics-bigquery-export.ts");

        expect(source).toContain("BIGQUERY_EXPORT_MIN_CADENCE_MS");
        expect(source).toContain("buildBigQueryExportWatermarkWindow");
        expect(source).toContain("claimBigQueryExportWindow");
        expect(source).toContain("BIGQUERY_EXPORT_STATUS_FAILURE_TTL_MS");
        expect(source).toContain("lastExportStatusFailureFingerprint");
        expect(source).toContain("queryGuardrails");
    });

    it("cheap-exits the BigQuery event trigger before claiming when the window is not due", () => {
        const source = readRepoFile("functions/src/analytics-bigquery-export.ts");

        expect(source).toContain("const dueForClaim = await shouldAttemptBigQueryExportClaim(nowMs)");
        expect(source).toContain("if (!dueForClaim)");
        expect(source).toContain("Skipped event-triggered export");
    });

    it("allows one daily BigQuery export claim window", () => {
        const source = readRepoFile("functions/src/analytics-bigquery-export.ts");

        expect(source).toContain("lastExportStartedAtMs: nowMs");
        expect(source).toContain("lastWindowClaimEventId: eventId");
        expect(source).toContain("schedule: \"0 4 * * *\"");
    });

    it("keeps the generated report scoped to formulas and percentages", () => {
        const report = JSON.parse(readRepoFile("agent/state/analytics-hot-path-cost-reduction.generated.json"));

        expect(report.reportKey).toBe("analytics-hot-path-cost-reduction");
        expect(report.summary.bigQueryDailyClaimEnabled).toBe(true);
        expect(report.summary.ingestMaterializationDeferred).toBe(true);
        expect(report.auditItemsAddressed).toEqual([7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22]);
        expect(JSON.stringify(report.costSavingsModel)).not.toMatch(/\$\d/u);
        expect(report.nextFixOrder.length).toBeGreaterThan(0);
    });
});
