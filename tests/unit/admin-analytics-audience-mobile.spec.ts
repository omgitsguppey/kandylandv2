import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx"),
  "utf8",
);

describe("Admin analytics audience mobile consolidation", () => {
  it("renders Top Paths as one compact mobile view mode at a time", () => {
    expect(source).toContain("topPathsViewMode");
    expect(source).toContain("setTopPathsViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={topPathsViewMode}");
    expect(source).toContain('data-top-paths-table="compact"');
    expect(source).toContain('topPathsViewMode === "chart"');
    expect(source).toContain('topPathsViewMode === "table"');
    expect(source).toContain('topPathsViewMode === "cards"');
    expect(source).toContain("data-top-paths-source-truth={topPathsModel.sourceTruth}");
    expect(source).toContain("data-top-paths-page={String(topPathsPage)}");
    expect(source).toContain("data-top-paths-page-size={String(topPathsPageSize)}");
  });
});
