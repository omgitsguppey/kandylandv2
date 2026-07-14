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
        expect(source).toContain("events: acceptedSanitizedEvents");
        expect(source).toContain("processed: parsed.data.events.length");
        expect(source).toContain("success: true");
    });

    it("keeps priority ingest on bounded projection and outbox owners", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");

        expect(source).toContain("writeGuestBehavioralTimelineProjection");
        expect(source).toContain("writeBehavioralTimelineProjection");
        expect(source).toContain('materializer: "user_index_materializer_requests_v3"');
        expect(source).not.toContain("materializeUserTrackingIndexes(");
        expect(source).not.toContain("writeBehavioralTimelineFacts(");
        expect(source).toContain("buildGuestBehavioralTimelineFacts");
        expect(source).toContain("mapRuntimeFactToBehavioralTimelineFact");
    });

    it("returns non-retryable 4xx for permanent ingest failures", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");
        const contract = readRepoFile("src/lib/analytics/ingest-contract.ts");

        expect(source).toContain("buildAnalyticsIngestFailureResponse(reason)");
        expect(source).toContain("retryable: classification.retryable");
        expect(source).toContain("{ status: classification.httpStatus }");
        expect(contract).toMatch(/payload_too_large:\s*\{[\s\S]*?httpStatus:\s*413,[\s\S]*?retryable:\s*false/u);
        expect(contract).toMatch(/invalid_json:\s*\{[\s\S]*?httpStatus:\s*400,[\s\S]*?retryable:\s*false/u);
        expect(contract).toMatch(/invalid_analytics_payload:\s*\{[\s\S]*?httpStatus:\s*422,[\s\S]*?retryable:\s*false/u);
    });

    it("suppresses high-volume consent diagnostics and caps warning fingerprints", () => {
        const source = readRepoFile("src/app/api/analytics/ingest/route.ts");
        const consentBlock = source.slice(
            source.indexOf("const consentFilteredEvents"),
            source.indexOf("const { sessionId, actorKind"),
        );

        expect(consentBlock).not.toContain("recordServerDiagnostic");
        expect(consentBlock).toContain("diagnosticPolicy");
        expect(consentBlock).toContain("requestAllowsAnonymousAnalytics(request, resolveGuestConsentEventName(event))");
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

    it("keeps BigQuery export on one scheduled claim path instead of an event trigger", () => {
        const source = readRepoFile("functions/src/analytics-bigquery-export.ts");

        expect(source).toContain("scheduledBigQueryRawEventsExport");
        expect(source).toContain("runBigQueryRawEventsExportWindow");
        expect(source).toContain("claimBigQueryExportWindow");
        expect(source).not.toContain("onDocumentCreated");
        expect(source).not.toContain("shouldAttemptBigQueryExportClaim");
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
