import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
  "utf8",
);

describe("Admin analytics operations mobile consolidation", () => {
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
