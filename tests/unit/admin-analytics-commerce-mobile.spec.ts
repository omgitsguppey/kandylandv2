import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx"),
  "utf8",
);

describe("Admin analytics commerce mobile consolidation", () => {
  it("renders Library Viewer Drilldown as one compact mobile view mode at a time", () => {
    expect(source).toContain("viewerDropViewMode");
    expect(source).toContain("setViewerDropViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={viewerDropViewMode}');
    expect(source).toContain('data-library-viewer-drop-table="compact"');
    expect(source).toContain('viewerDropViewMode === "chart"');
    expect(source).toContain('viewerDropViewMode === "table"');
    expect(source).toContain('viewerDropViewMode === "cards"');
    expect(source).toContain("data-library-viewer-drop-source-truth={viewerSourceTruth}");
    expect(source).toContain("data-library-viewer-drop-freshness={viewerFreshnessState}");
  });
});
