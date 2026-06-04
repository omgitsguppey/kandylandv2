import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx"),
  "utf8",
);

describe("Admin analytics audience mobile consolidation", () => {
  it("renders Navigation Destinations as one compact mobile view mode at a time", () => {
    expect(source).toContain("navigationDestinationsViewMode");
    expect(source).toContain("setNavigationDestinationsViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={navigationDestinationsViewMode}");
    expect(source).toContain('data-navigation-destinations-table="compact"');
    expect(source).toContain('navigationDestinationsViewMode === "chart"');
    expect(source).toContain('navigationDestinationsViewMode === "table"');
    expect(source).toContain('navigationDestinationsViewMode === "cards"');
    expect(source).toContain("data-navigation-destinations-range={navigationDestinationsModel.range}");
    expect(source).toContain("data-navigation-destinations-source-mode={navigationDestinationsModel.sourceMode}");
  });

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

  it("renders Regions as one compact mobile view mode at a time", () => {
    expect(source).toContain("regionsViewMode");
    expect(source).toContain("setRegionsViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={regionsViewMode}");
    expect(source).toContain('data-regions-table="compact"');
    expect(source).toContain("data-regions-source-truth={regionsModel.sourceTruth}");
    expect(source).toContain("data-regions-freshness={regionsModel.freshnessState}");
    expect(source).toContain("data-regions-filter-mode={regionsFilterMode}");
    expect(source).toContain('regionsViewMode === "chart"');
    expect(source).toContain('regionsViewMode === "table"');
    expect(source).toContain('regionsViewMode === "cards"');
  });

  it("renders Return Cadence as one compact mobile view mode at a time", () => {
    expect(source).toContain("returnCadenceViewMode");
    expect(source).toContain("setReturnCadenceViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={returnCadenceViewMode}");
    expect(source).toContain('data-return-cadence-chart="compact"');
    expect(source).toContain('data-return-cadence-table="compact"');
    expect(source).toContain("data-return-cadence-source-truth={returnCadenceModel.sourceTruth}");
    expect(source).toContain("data-return-cadence-freshness={returnCadenceModel.freshnessState}");
    expect(source).toContain("data-return-cadence-range={returnCadenceModel.range}");
    expect(source).toContain('returnCadenceViewMode === "chart"');
    expect(source).toContain('returnCadenceViewMode === "table"');
    expect(source).toContain('returnCadenceViewMode === "cards"');
  });
});
