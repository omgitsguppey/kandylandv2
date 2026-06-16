import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
  "utf8",
);

describe("Admin analytics operations mobile consolidation", () => {
  it("renders Activity Snapshot as one compact mobile view mode at a time", () => {
    expect(source).toContain('title="Activity Snapshot"');
    expect(source).not.toContain('title="Live Pulse"');
    expect(source).toContain("livePulseViewMode");
    expect(source).toContain("setLivePulseViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={livePulseViewMode}");
    expect(source).toContain('data-live-pulse-chart="compact"');
    expect(source).toContain('data-live-pulse-table="compact"');
    expect(source).toContain("data-live-pulse-graph-source={livePulseModel.graphSourceLabel}");
    expect(source).toContain("data-live-pulse-refresh-state={livePulseModel.refreshState}");
    expect(source).toContain('livePulseViewMode === "chart"');
    expect(source).toContain('livePulseViewMode === "table"');
    expect(source).toContain('livePulseViewMode === "cards"');
    expect(source).toContain("Graph waiting for current activity.");
    expect(source).toContain("Surface detail has no current activity sample yet.");
    expect(source).not.toContain("realtime upgrade");
  });

  it("renders Guest Quality as one compact mobile view mode at a time", () => {
    expect(source).toContain("guestQualityViewMode");
    expect(source).toContain("setGuestQualityViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={guestQualityViewMode}");
    expect(source).toContain('data-guest-quality-table="compact"');
    expect(source).toContain('data-guest-quality-chart="compact"');
    expect(source).toContain("data-guest-quality-state={guestBounceQualityModel.guestQuality.state}");
    expect(source).toContain("data-guest-quality-series-state={guestBounceQualityModel.series.state}");
    expect(source).toContain('guestQualityViewMode === "chart"');
    expect(source).toContain('guestQualityViewMode === "table"');
    expect(source).toContain('guestQualityViewMode === "cards"');
  });

  it("renders Auth Outcomes as one compact mobile view mode at a time", () => {
    expect(source).toContain("authOutcomeViewMode");
    expect(source).toContain("setAuthOutcomeViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={authOutcomeViewMode}");
    expect(source).toContain('data-auth-outcomes-table="compact"');
    expect(source).toContain('data-auth-outcomes-chart="compact"');
    expect(source).toContain("data-auth-outcomes-hydration-state={authOutcomeModel.hydrationState}");
    expect(source).toContain("data-auth-outcomes-measurement-mode={authOutcomeModel.measurementMode}");
    expect(source).toContain('authOutcomeViewMode === "chart"');
    expect(source).toContain('authOutcomeViewMode === "table"');
    expect(source).toContain('authOutcomeViewMode === "cards"');
  });

  it("renders Journey Funnel as one compact mobile view mode at a time", () => {
    expect(source).toContain("journeyFunnelViewMode");
    expect(source).toContain("setJourneyFunnelViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={journeyFunnelViewMode}");
    expect(source).toContain('data-journey-funnel-chart="compact"');
    expect(source).toContain('data-journey-funnel-table="compact"');
    expect(source).toContain("data-journey-funnel-hydration-state={journeyFunnelModel.hydrationState}");
    expect(source).toContain("data-journey-funnel-measurement-mode={journeyFunnelModel.measurementMode}");
    expect(source).toContain("data-journey-funnel-denominator-mode={journeyFunnelModel.denominatorMode}");
    expect(source).toContain('journeyFunnelViewMode === "chart"');
    expect(source).toContain('journeyFunnelViewMode === "table"');
    expect(source).toContain('journeyFunnelViewMode === "cards"');
  });

  it("renders Event Mix as one compact mobile view mode at a time", () => {
    expect(source).toContain("eventMixViewMode");
    expect(source).toContain("setEventMixViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={eventMixViewMode}");
    expect(source).toContain('data-event-mix-table="compact"');
    expect(source).toContain("data-event-mix-source-mode={eventMixModel.eventMixSourceMode}");
    expect(source).toContain("data-event-mix-surface-context={eventMixModel.actualSurfaceContextState}");
    expect(source).toContain('eventMixViewMode === "chart"');
    expect(source).toContain('eventMixViewMode === "table"');
    expect(source).toContain('eventMixViewMode === "cards"');
  });
});
