import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: vi.fn(),
}));

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("GA4 recovery truth", () => {
  it("classifies missing configuration without producing zero traffic", async () => {
    const { buildGa4EvidenceState, resolveGa4Status } = await import("@/lib/analytics/ga4-truth");

    expect(resolveGa4Status({})).toBe("config_missing");
    expect(buildGa4EvidenceState({}).evidenceStatus).toBe("config_missing");
    expect(buildGa4EvidenceState({}).trafficValue).toBeNull();
    expect(buildGa4EvidenceState({}).displayValue).toBe("Unavailable");
    expect(buildGa4EvidenceState({}).sourceRole).toBe("external_evidence_only");
  });

  it("keeps first-party analytics as product truth and GA4 as evidence only", async () => {
    const { buildGa4EvidenceState } = await import("@/lib/analytics/ga4-truth");

    const state = buildGa4EvidenceState({
      measurementId: "G-TEST123",
      propertyId: "123456",
      apiSecretPresent: true,
    });

    expect(state.firstPartyAnalyticsPrimary).toBe(true);
    expect(state.ga4EvidenceOnly).toBe(true);
    expect(state.evidenceStatus).toBe("evidence_only");
    expect(state.productTruthSource).toBe("first_party_analytics");
  });

  it("classifies imported GA4 samples as evidence-only and stale when aged out", async () => {
    const { buildGa4EvidenceState } = await import("@/lib/analytics/ga4-truth");
    const nowMs = Date.parse("2026-06-07T00:00:00.000Z");

    expect(buildGa4EvidenceState({
      measurementId: "G-TEST123",
      importedSamplePresent: true,
      nowMs,
    }).evidenceStatus).toBe("imported_sample");

    expect(buildGa4EvidenceState({
      measurementId: "G-TEST123",
      importedSamplePresent: true,
      lastImportedAtMs: nowMs - (48 * 60 * 60 * 1000),
      nowMs,
    }).evidenceStatus).toBe("stale");
  });

  it("blocks default Admin Data API calls and requires explicit refresh plus TTL", async () => {
    const { shouldRunGa4AdminRefresh } = await import("@/lib/analytics/ga4-truth");
    const now = Date.parse("2026-05-19T20:00:00.000Z");

    expect(shouldRunGa4AdminRefresh({ explicitRefresh: false, propertyId: "123", nowMs: now })).toBe(false);
    expect(shouldRunGa4AdminRefresh({ explicitRefresh: true, propertyId: "", nowMs: now })).toBe(false);
    expect(shouldRunGa4AdminRefresh({
      explicitRefresh: true,
      propertyId: "123",
      lastRunAtMs: now - 60_000,
      nowMs: now,
    })).toBe(false);
    expect(shouldRunGa4AdminRefresh({
      explicitRefresh: true,
      propertyId: "123",
      lastRunAtMs: now - 10 * 60_000,
      nowMs: now,
    })).toBe(true);
  });

  it("blocks a GA4 report outside the fixed explicit-refresh budget", async () => {
    const { runVendorReportWhenAllowed } = await import("@/lib/server/admin-analytics/ga4-evidence");
    const runReport = vi.fn();
    const issues: string[] = [];

    const result = await runVendorReportWhenAllowed({
      allowVendorReports: true,
      analyticsClient: { runReport } as never,
      requestConfig: { property: "properties/123" } as never,
      label: "overflow report",
      issues,
      reportBudgetSlot: 8,
    });

    expect(runReport).not.toHaveBeenCalled();
    expect(result).toMatchObject({ rows: [], fallbackUsed: true, sourceState: "deferred" });
    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining("7-report refresh budget was exhausted"),
    ]));
  });

  it("gates client GA4 on env and consent", async () => {
    const { isGa4ClientEnabled } = await import("@/lib/analytics/ga4-truth");

    expect(isGa4ClientEnabled({ measurementId: "", consentGranted: true })).toBe(false);
    expect(isGa4ClientEnabled({ measurementId: "G-TEST123", consentGranted: false })).toBe(false);
    expect(isGa4ClientEnabled({ measurementId: "G-TEST123", consentGranted: true })).toBe(true);
  });

  it("surfaces GA4 evidence status in admin analytics without blocking first-party fallback", () => {
    const route = read("src/app/api/admin/analytics/historical/route.ts");
    const analyticsData = read("src/lib/server/admin-analytics-data.ts");
    const ga4Evidence = read("src/lib/server/admin-analytics/ga4-evidence.ts");
    const clientTracker = read("src/components/Analytics/Ga4EvidenceTracker.tsx");

    expect(route).not.toContain("requiresSetup: true");
    expect(route).toContain("buildGa4EvidenceState");
    expect(analyticsData).toContain("shouldRunGa4AdminRefresh");
    expect(ga4Evidence).toContain("ga4_config_missing");
    expect(ga4Evidence).toContain("first-party product truth remains authoritative");
    expect(clientTracker).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(clientTracker).toContain("canUseAnonymousAnalytics");
    expect(existsSync(join(root, "src/lib/analytics/ga4-truth.ts"))).toBe(true);
  });
});
