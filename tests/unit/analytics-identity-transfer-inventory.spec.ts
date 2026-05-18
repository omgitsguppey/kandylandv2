import { describe, expect, it } from "vitest";

import {
  buildAnalyticsIdentityTransferInventoryReport,
  validateAnalyticsIdentityTransferInventoryReport,
  type AnalyticsIdentityTransferInventoryReport,
} from "../../scripts/agent/validate-analytics-identity-transfer-inventory";

const sources = {
  "src/lib/client-session.ts": `
    export function getClientAnalyticsIdentitySnapshot() {
      return { anonymousVisitorId: "subject_123", sessionId: "sess_123" };
    }
    export function buildClientIdentityLinkRecord() {}
  `,
  "src/components/Analytics/DeepTracker.tsx": `
    buildGuestAnalyticsIngestPayload([{ type: "page_view" }]);
    const payload = { anonymousVisitorId, sessionId, batchId };
  `,
  "src/app/api/analytics/ingest/route.ts": `
    adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.guestBatches);
    const collection = "analytics_guest_batches";
  `,
  "src/app/api/analytics/ingest-identified/route.ts": `
    if (canonicalEventName === "identity_linked") {
      await upsertAnalyticsIdentityLink({ anonymousVisitorId, sessionId, userId });
    }
    adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.runtimeFacts);
    const collection = "analytics_event_facts";
  `,
};

describe("analytics identity transfer inventory", () => {
  it("maps guest, user, transfer, truth, watch, and cost lanes", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
    });

    expect(report.summary.guestIdentitySources).toBeGreaterThanOrEqual(2);
    expect(report.summary.userIdentitySources).toBeGreaterThanOrEqual(2);
    expect(report.summary.transferCandidates).toBeGreaterThanOrEqual(3);
    expect(report.sourceTruthMap.some((entry) => entry.truthRole === "product_truth")).toBe(true);
    expect(report.sourceTruthMap.some((entry) => entry.truthRole === "evidence_only")).toBe(true);
    expect(report.watchTimeMap.some((entry) => entry.runtimePlaybackTruth && !entry.pageOpenTimeAllowed)).toBe(true);
    expect(report.costFindings.some((entry) => entry.lane === "cloud_run")).toBe(true);
    expect(report.costFindings.some((entry) => entry.lane === "cloud_sql")).toBe(true);
    expect(report.costFindings.some((entry) => entry.lane === "gemini_cloud_assist")).toBe(true);
    expect(report.costFindings.some((entry) => entry.lane === "route_4xx")).toBe(true);
    expect(report.nextFixOrder).not.toHaveLength(0);
    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toEqual([]);
  });

  it("fails when transfer candidates are missing", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
    }) as AnalyticsIdentityTransferInventoryReport;
    report.identityMap = report.identityMap.map((entry) => ({ ...entry, transferCandidate: false }));
    report.summary.transferCandidates = 0;

    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toContain(
      "transfer candidates are missing.",
    );
  });

  it("fails when product truth and evidence-only lanes are collapsed", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
    }) as AnalyticsIdentityTransferInventoryReport;
    report.sourceTruthMap = report.sourceTruthMap.filter((entry) => entry.truthRole !== "evidence_only");

    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toContain(
      "analytics evidence-only layers are not separated.",
    );
  });

  it("fails when watch time is not mapped to runtime playback truth", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
    }) as AnalyticsIdentityTransferInventoryReport;
    report.watchTimeMap = [];

    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toContain(
      "watch-time sources are not mapped to runtime playback truth.",
    );
  });

  it("fails when cost status lanes are missing", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
    }) as AnalyticsIdentityTransferInventoryReport;
    report.costFindings = report.costFindings.filter((entry) => entry.lane !== "cloud_sql");

    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toContain(
      "cloud_sql cost status lane is missing.",
    );
  });
});
