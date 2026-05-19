import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  EXTERNAL_ANALYTICS_TRUTH_CONTRACT,
  buildExternalAnalyticsTruthState,
  resolveExternalAnalyticsStatuses,
  validateExternalAnalyticsTruthClosure,
} from "@/lib/analytics/external-analytics-truth";

const repoRoot = path.resolve(__dirname, "../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("external analytics truth closure", () => {
  it("classifies GA4 and PostHog states without mystery status", () => {
    const state = resolveExternalAnalyticsStatuses({
      ga4ClientCodePresent: true,
      ga4ClientMeasurementIdPresent: false,
      ga4ServerPropertyIdPresent: true,
      ga4ServerDataApiDependencyPresent: true,
      ga4Disabled: false,
      posthogClientCodePresent: true,
      posthogKeyPresent: false,
      externalDisabled: false,
    });

    expect(state.ga4).toEqual(expect.arrayContaining([
      "ga4_server_configured",
      "ga4_evidence_only",
    ]));
    expect(state.ga4).not.toContain("ga4_state_unknown");
    expect(state.posthog).toContain("posthog_missing");
    expect(state.overall).toBe("ga4_evidence_only");
  });

  it("treats missing external analytics as unavailable evidence, not zero traffic", () => {
    const state = buildExternalAnalyticsTruthState({
      ga4ClientCodePresent: true,
      ga4ClientMeasurementIdPresent: false,
      ga4ServerPropertyIdPresent: false,
      ga4ServerDataApiDependencyPresent: true,
      posthogClientCodePresent: true,
      posthogKeyPresent: false,
    });

    expect(state.firstPartyAnalyticsPrimary).toBe(true);
    expect(state.externalAnalyticsProductTruth).toBe(false);
    expect(state.missingExternalAnalyticsTrafficBehavior).toBe("unavailable_not_zero");
    expect(state.displayTrafficValue).toBeNull();
  });

  it("requires env and consent before any client external tracker can load", () => {
    expect(EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.ga4.requiresEnv).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.ga4.requiresConsent).toBe(true);
    expect(EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.posthog.requiresEnv).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.posthog.requiresConsent).toBe(true);
  });

  it("keeps GA Data API blocked by default and evidence-only when server evidence is configured", () => {
    const state = buildExternalAnalyticsTruthState({
      ga4ClientCodePresent: true,
      ga4ClientMeasurementIdPresent: false,
      ga4ServerPropertyIdPresent: true,
      ga4ServerDataApiDependencyPresent: true,
      posthogClientCodePresent: true,
      posthogKeyPresent: false,
      explicitRefreshRequired: true,
    });

    expect(state.ga4Statuses).toContain("ga4_server_configured");
    expect(state.defaultDataApiCallsBlocked).toBe(true);
    expect(state.externalAnalyticsProductTruth).toBe(false);
  });

  it("matches the current source wiring for GA4 and PostHog", () => {
    const ga4Tracker = readRepoFile("src/components/Analytics/Ga4EvidenceTracker.tsx");
    const posthogProvider = readRepoFile("src/components/Analytics/CSPostHogProvider.tsx");
    const appHosting = readRepoFile("apphosting.yaml");
    const analyticsData = readRepoFile("src/lib/server/admin-analytics-data.ts");

    expect(ga4Tracker).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(ga4Tracker).toContain("canUseAnonymousAnalytics");
    expect(appHosting).toContain("GA_PROPERTY_ID");
    expect(appHosting).toContain("GA_MEASUREMENT_ID");
    expect(appHosting).not.toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(posthogProvider).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(analyticsData).toContain("allowGa4VendorReports");
  });

  it("validates the external analytics closure contract", () => {
    const result = validateExternalAnalyticsTruthClosure();

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
