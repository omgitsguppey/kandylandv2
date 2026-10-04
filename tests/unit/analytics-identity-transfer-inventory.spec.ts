import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAnalyticsIdentityTransferInventoryReport,
  validateAnalyticsIdentityTransferInventoryReport,
  type AnalyticsIdentityTransferInventoryReport,
} from "../../scripts/agent/validate-analytics-identity-transfer-inventory";

// Actual maintained source, inspected only. No auth, Firebase or provider execution.
const sourcePaths = [
  "src/context/AuthContext.tsx",
  "src/lib/client-session.ts",
  "src/components/Analytics/DeepTracker.tsx",
  "src/lib/analytics/analytics-identity-link.ts",
  "src/app/api/analytics/identity-link/route.ts",
  "src/app/api/analytics/ingest/route.ts",
  "src/app/api/analytics/ingest-identified/route.ts",
];
const sources = Object.fromEntries(sourcePaths.map(sourcePath => [sourcePath, readFileSync(join(process.cwd(), sourcePath), "utf8")]));
const reportInput = { currentHead: "head", generatedAtUtc: "2026-10-02T12:00:00.000Z", sources };

describe("analytics identity transfer inventory", () => {
  it("maps guest, user, transfer, truth, watch, and cost lanes", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-17T10:00:00.000Z",
      sources,
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
      sources,
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
      sources,
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
      sources,
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
      sources,
    }) as AnalyticsIdentityTransferInventoryReport;
    report.costFindings = report.costFindings.filter((entry) => entry.lane !== "cloud_sql");

    expect(validateAnalyticsIdentityTransferInventoryReport(report, sources, { currentHead: "head" })).toContain(
      "cloud_sql cost status lane is missing.",
    );
  });
  it("reports the source-checked canonical handoff without inventing deployed or historical proof", () => {
    const report = buildAnalyticsIdentityTransferInventoryReport(reportInput);
    const bridge = report.identityMap.find(entry => entry.id === "identity-linked-bridge");
    expect(bridge?.source).toBe("AuthContext -> buildIdentityLinkPayload.submit -> /api/analytics/identity-link");
    expect(bridge?.collectionOrPath).toContain("src/app/api/analytics/identity-link/route.ts");
    expect(bridge?.notes).toContain("does not prove deployed or historical continuity");
    expect(report.identityMap.find(entry => entry.id === "identified-ingest-user")?.notes).toContain("diagnostic only");
    expect(report.transferGaps.some(gap => gap.id === "login-signup-transfer-entrypoint-not-proven")).toBe(false);
    expect(report.transferGaps.some(gap => gap.id === "auth-handoff-source-chain-incomplete")).toBe(false);
    expect(report.nextFixOrder.join(" ")).not.toContain("If absent, add");
  });

  it("derives an incomplete source finding when the existing handoff is disconnected", () => {
    const disconnected = { ...sources, "src/context/AuthContext.tsx": "" };
    const report = buildAnalyticsIdentityTransferInventoryReport({ ...reportInput, sources: disconnected });
    expect(report.transferGaps.find(gap => gap.id === "auth-handoff-source-chain-incomplete")?.currentState).toContain("handoff");
    expect(report.nextFixOrder[0]).toContain("Repair the reported existing");
  });

  it.each(["login", "signup", "session_restore"])("fails when the actual %s transition is disconnected", method => {
    const auth = sources["src/context/AuthContext.tsx"].replace(new RegExp('emitIdentityLinkContinuity\\(([^\\n]+), "' + method + '"\\)', 'g'), 'disconnectedHandoff($1, "' + method + '")');
    const broken = { ...sources, "src/context/AuthContext.tsx": auth };
    const report = buildAnalyticsIdentityTransferInventoryReport(reportInput);
    expect(validateAnalyticsIdentityTransferInventoryReport(report, broken)).toContain("AuthContext " + method + " handoff call is missing.");
  });

  it.each(["payload.submit", "hasSubmittedIdentityLink"])("fails when %s is removed from the actual guarded callback", call => {
    const broken = { ...sources, "src/context/AuthContext.tsx": sources["src/context/AuthContext.tsx"].replaceAll(call, "disconnectedCall") };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain(
      "AuthContext handoff must build, lifecycle-guard and submit the canonical identity payload.");
  });

  it("fails when the actual payload submit targets another endpoint", () => {
    const broken = { ...sources, "src/lib/analytics/analytics-identity-link.ts": sources["src/lib/analytics/analytics-identity-link.ts"].replace('"/api/analytics/identity-link"', '"/api/analytics/ingest-identified"') };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain("Identity payload submit must target /api/analytics/identity-link.");
  });

  it("fails when the association writer binds a body identity instead of the authenticated caller", () => {
    const broken = { ...sources, "src/app/api/analytics/identity-link/route.ts": sources["src/app/api/analytics/identity-link/route.ts"].replaceAll("userId: caller.uid", "userId: parsed.data.userId") };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain("Canonical identity route must own the caller-bound association write.");
  });

  it("fails when request consent is no longer the association upper bound", () => {
    const broken = { ...sources, "src/app/api/analytics/identity-link/route.ts": sources["src/app/api/analytics/identity-link/route.ts"].replaceAll("resolveRequestConsentMode(request)", '"full_behavioral_consent"') };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain("Canonical identity route must clamp declared consent to request consent.");
  });

  it("fails when identified ingest regains a duplicate association mutation", () => {
    const broken = { ...sources, "src/app/api/analytics/ingest-identified/route.ts": sources["src/app/api/analytics/ingest-identified/route.ts"] + "\nupsertAnalyticsIdentityLink({ anonymousVisitorId, sessionId, userId });" };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain("Identified ingest must not duplicate the canonical association writer.");
  });

  it.each([["diagnostic_only: true", "diagnostic_only: false"], ["const identityLinksCreated = 0", "const identityLinksCreated = 1"]])("fails when observed identity compatibility loses %s", (from, to) => {
    const broken = { ...sources, "src/app/api/analytics/ingest-identified/route.ts": sources["src/app/api/analytics/ingest-identified/route.ts"].replace(from, to) };
    expect(validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken)).toContain("Observed identity ingest must retain diagnostic exclusion and zero-created compatibility status.");
  });

  it("does not accept comments containing all the handoff tokens as connected source", () => {
    const broken = Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, "/*\n" + value + "\n*/"]));
    const failures = validateAnalyticsIdentityTransferInventoryReport(buildAnalyticsIdentityTransferInventoryReport(reportInput), broken);
    expect(failures).toContain("Identity payload submit must target /api/analytics/identity-link.");
    expect(failures).toContain("Canonical identity route must own the caller-bound association write.");
  });

});
