import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx"),
  "utf8",
);
const utilitySource = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.utils.ts"),
  "utf8",
);

describe("Admin analytics commerce mobile consolidation", () => {
  it("keeps the large commerce snapshot drilldown collapsed by default", () => {
    expect(source).toContain('title="Commerce Snapshot"');
    expect(source).toContain("defaultExpanded={false}");
  });

  it("renders Recent Commerce Feed as one compact mobile view mode at a time", () => {
    expect(source).toContain("recentCommerceFeedViewMode");
    expect(source).toContain("setRecentCommerceFeedViewMode");
    expect(source).toContain('data-admin-analytics-mobile-view-mode={recentCommerceFeedViewMode}');
    expect(source).toContain('data-recent-commerce-feed-table="compact"');
    expect(source).toContain('data-recent-commerce-feed-timeline="compact"');
    expect(source).toContain('recentCommerceFeedViewMode === "timeline"');
    expect(source).toContain('recentCommerceFeedViewMode === "table"');
    expect(source).toContain('recentCommerceFeedViewMode === "cards"');
    expect(source).toContain("data-recent-commerce-feed-range={recentCommerceFeedRange}");
    expect(source).toContain("data-recent-commerce-feed-source-state={recentCommerceFeedModel.rows.length > 0 ? \"loaded\" : \"no_sample\"}");
  });

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

  it("labels missing top-drop conversion samples without raw zero summaries", () => {
    expect(source).toContain("topDropConversionSummaryLine");
    expect(source).toContain('topDropConversionReadableSourceLabel === "Source missing"');
    expect(source).toContain("`No verified drops | ${topDropConversionReadableSourceLabel}`");
    expect(source).toContain("summaryLine={topDropConversionSummaryLine}");
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

  it("uses shared labels for visible commerce source truth", () => {
    expect(source).toContain("formatAdminAnalyticsSourceTruthLabel");
    expect(source).toContain("formatAdminAnalyticsSourceStateLabel");
    expect(source).toContain("formatCommerceSourceHint");
    expect(utilitySource).toContain("formatCommerceScopeLabel");
    expect(source).toContain("formatCommerceMetricLabel");
    expect(source).toContain("formatCommerceReadableSourceLabel");
    expect(source).toContain("formatCommerceFundsLabel");
    expect(source).toContain("topDropConversionSourceLabel");
    expect(source).toContain("recentCommerceFeedSourceLabel");
    expect(source).toContain("viewerSourceLabel");
    expect(source).toContain("title={topDropConversionModel.sourceTruth}");
    expect(source).toContain("title={recentCommerceFeedModel.sourceTruth}");
    expect(source).toContain("title={drop.sourceTruth}");
    expect(source).toContain("title={item.sourceTruth}");
    expect(source).not.toContain('${revenueCard?.scope ?? "unknown"} | ${revenueCard?.sourceTruth ?? "unknown"}');
    expect(source).not.toContain('${purchasesCard?.scope ?? "unknown"} | ${purchasesCard?.sourceTruth ?? "unknown"}');
    expect(source).not.toContain("source ${topDropConversionModel.sourceTruth}");
    expect(source).not.toContain("<span>{drop.sourceTruth}</span>");
    expect(source).not.toContain("<p>Source: {drop.sourceTruth}</p>");
    expect(source).not.toContain("{item.sourceLabel} | {item.sourceTruth}");
    expect(source).not.toContain("source {viewerSourceTruth.replace(/_/g, \" \")}");
    expect(source).toContain("Identity details");
    expect(source).not.toContain("Raw identity and source details");
    expect(source).not.toContain("Source truth");
    expect(source).not.toContain("Source label:");
    expect(source).not.toContain("Recovery label:");
    expect(source).not.toContain("Treasury truth lives in Platform Economy.");
    expect(source).toContain('data-admin-analytics-vendor-source-label="vendor_evidence"');
    expect(source).toContain('data-admin-analytics-recovery-promotion="debug_only_not_promoted"');
    expect(source).not.toContain("commerceSnapshotModel.adjustedProfitFormula");
    expect(source).not.toContain("commerceSnapshotModel.yieldPer100GdFormula");
    expect(source).not.toContain("Decision source: {verifiedSnapshotLabel}");
    expect(source).toContain("Identity details");
    expect(source).toContain("Watch source");
    expect(source).toContain("Server ledger remains the treasury source.");
  });
});
