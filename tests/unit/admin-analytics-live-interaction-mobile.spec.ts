import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
  "utf8",
);

describe("Admin analytics live interaction mobile consolidation", () => {
  it("renders Live Interaction Stream as one compact mobile view mode at a time", () => {
    expect(source).toContain("liveInteractionViewMode");
    expect(source).toContain("setLiveInteractionViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={liveInteractionViewMode}");
    expect(source).toContain('data-live-interaction-table="compact"');
    expect(source).toContain("data-live-interaction-source-truth={liveInteractionStreamModel.sourceTruth}");
    expect(source).toContain("data-live-interaction-source-mode={liveInteractionStreamModel.streamSourceMode}");
    expect(source).toContain('liveInteractionViewMode === "chart"');
    expect(source).toContain('liveInteractionViewMode === "table"');
    expect(source).toContain('liveInteractionViewMode === "cards"');
  });
});
