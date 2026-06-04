import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx"),
  "utf8",
);

describe("Admin analytics commerce mobile consolidation", () => {
  it("renders Viewer Journey as one compact mobile view mode at a time", () => {
    expect(source).toContain("viewerJourneyViewMode");
    expect(source).toContain("setViewerJourneyViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={viewerJourneyViewMode}');
    expect(source).toContain('data-viewer-journey-table="compact"');
    expect(source).toContain('viewerJourneyViewMode === "chart"');
    expect(source).toContain('viewerJourneyViewMode === "table"');
    expect(source).toContain('viewerJourneyViewMode === "cards"');
    expect(source).toContain("data-viewer-journey-range={viewerJourneyRange}");
    expect(source).toContain("data-viewer-journey-source-state={viewerJourneyItems.length > 0 ? \"loaded\" : \"no_sample\"}");
  });

  it("renders Watch Depth + Tags as one compact mobile view mode at a time", () => {
    expect(source).toContain("watchDepthTagsViewMode");
    expect(source).toContain("setWatchDepthTagsViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={watchDepthTagsViewMode}');
    expect(source).toContain('data-watch-depth-tags-table="compact"');
    expect(source).toContain('watchDepthTagsViewMode === "chart"');
    expect(source).toContain('watchDepthTagsViewMode === "table"');
    expect(source).toContain('watchDepthTagsViewMode === "cards"');
    expect(source).toContain("data-watch-depth-tags-range={watchDepthTagsRange}");
    expect(source).toContain("data-watch-depth-tags-source-state={watchDepthTagBuckets.length > 0 || watchDepthTagDemand.length > 0 ? \"loaded\" : \"no_sample\"}");
  });

  it("renders Package Performance as one compact mobile view mode at a time", () => {
    expect(source).toContain("packagePerformanceViewMode");
    expect(source).toContain("setPackagePerformanceViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={packagePerformanceViewMode}');
    expect(source).toContain('data-package-performance-table="compact"');
    expect(source).toContain('packagePerformanceViewMode === "chart"');
    expect(source).toContain('packagePerformanceViewMode === "table"');
    expect(source).toContain('packagePerformanceViewMode === "cards"');
    expect(source).toContain("data-package-performance-source-state={packagePerformancePanelState?.sourceState ?? \"unknown\"}");
    expect(source).toContain("data-package-performance-range={packagePerformancePanelState?.range ?? packagePerformanceRange}");
  });

  it("renders Content Conversion as one compact mobile view mode at a time", () => {
    expect(source).toContain("contentConversionViewMode");
    expect(source).toContain("setContentConversionViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={contentConversionViewMode}');
    expect(source).toContain('data-content-conversion-table="compact"');
    expect(source).toContain('contentConversionViewMode === "chart"');
    expect(source).toContain('contentConversionViewMode === "table"');
    expect(source).toContain('contentConversionViewMode === "cards"');
    expect(source).toContain("data-content-conversion-source-truth={contentConversionModel.sourceTruth}");
    expect(source).toContain("data-content-conversion-source-state={contentConversionModel.sourceState}");
  });

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
