import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
  "utf8",
);

describe("Admin analytics operations mobile consolidation", () => {
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
