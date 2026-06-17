import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-analytics-audience-snapshot] ${message}`);
  process.exitCode = 1;
}

function assertIncludes(file: string, source: string, expected: string) {
  if (!source.includes(expected)) {
    fail(`${file} is missing ${expected}`);
  }
}

function assertNotIncludes(file: string, source: string, unexpected: string) {
  if (source.includes(unexpected)) {
    fail(`${file} still contains ${unexpected}`);
  }
}

const component = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const contracts = read("src/lib/admin-analytics-contracts.ts");
const adminUserTruthSnapshot = read("src/lib/server/admin-user-truth-snapshot.ts");
const helper = read("src/lib/admin-analytics-audience-snapshot.ts");
const deviceMixHelper = read("src/lib/admin-analytics-device-mix.ts");
const topPathsHelper = read("src/lib/admin-analytics-top-paths.ts");
const regionDemandHelper = read("src/lib/admin-analytics-region-demand.ts");
const returnCadenceHelper = read("src/lib/admin-analytics-return-cadence.ts");
const route = read("src/app/api/admin/analytics/historical/route.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const types = read("src/types/admin-analytics.ts");
const doc = read("docs/agent-truth/admin-analytics-audience-snapshot.md");

assertIncludes("audience types", types, "export type AudienceSnapshotState");
assertIncludes("admin user truth snapshot", adminUserTruthSnapshot, "buildAdminUserTruthSnapshot");
assertIncludes("audience types", types, "sourceState: \"verified\" | \"mixed\" | \"estimated\" | \"partial\" | \"gap_detected\" | \"stale\"");
assertIncludes("audience types", types, "export type AudienceSnapshotDiagnostics");
assertIncludes("audience types", types, "export type ReturnCadenceState");
assertIncludes("audience types", types, "export type DeviceMixPanelState");
assertIncludes("audience types", types, "export type TopPathsPanelState");
assertIncludes("audience types", types, "export type RegionDemandPanelState");
assertIncludes("audience types", types, "export type RegionDemandRow");
assertIncludes("audience types", types, "engagementDefinition: string");
assertIncludes("audience types", types, "unknownSessions: number");
assertIncludes("audience types", types, "routeGroup:");
assertIncludes("audience types", types, "pageSize: number");
assertIncludes("audience types", types, "countUnit: \"views\" | \"sessions\" | \"users\" | \"events\" | \"mixed\"");

assertIncludes("historical route", route, "audienceSnapshotDiagnostics");
assertIncludes("historical route", route, "recoveredByGaDayKeys");
assertIncludes("historical route", route, "firstPartyPresentDayKeys");
assertIncludes("historical route", route, "guestEstimatedOnlyDayKeys");
assertIncludes("historical route", route, "deviceMixPanelState");
assertIncludes("historical route", route, "topPathsPanelState");
assertIncludes("historical route", route, "regionDemandPanelState");
assertIncludes("historical route", route, "analyticsSourceHealth");

assertIncludes("audience helper", helper, "continuitySummary");
assertIncludes("audience helper", helper, "Traffic gap detected");
assertIncludes("audience helper", helper, "Recovered from GA totals");
assertIncludes("audience helper", helper, "Estimated because consented guest batches are unavailable");
assertIncludes("audience helper", helper, "sourceState");
assertIncludes("audience helper", helper, "gap_detected");
assertIncludes("audience helper", helper, "guestEstimateMetadata");
assertIncludes("device mix helper", deviceMixHelper, "buildAdminAnalyticsDeviceMixModel");
assertIncludes("device mix helper", deviceMixHelper, "GA engaged sessions / GA sessions for each device category.");
assertIncludes("device mix helper", deviceMixHelper, "Device mix is GA session-based, not authenticated-user based.");
assertIncludes("device mix helper", deviceMixHelper, "Mobile is dominant; prioritize mobile layout, thumb-reach CTAs, and image payload limits.");
assertIncludes("device mix helper", deviceMixHelper, "Unknown device sessions need classification review");
assertIncludes("top paths helper", topPathsHelper, "buildAdminAnalyticsTopPathsModel");
assertIncludes("top paths helper", topPathsHelper, "\"high_volume_low_engagement\"");
assertIncludes("top paths helper", topPathsHelper, "\"zero_time\"");
assertIncludes("top paths helper", topPathsHelper, "Top 25 snapshot only. This panel paginates the available snapshot, not every path in GA.");
assertIncludes("top paths helper", topPathsHelper, "\"creator\"");
assertIncludes("top paths helper", topPathsHelper, "\"legal\"");
assertIncludes("top paths helper", topPathsHelper, "\"dashboard\"");
assertIncludes("top paths helper", topPathsHelper, "0s avg time on a legal/static path can reflect quick policy reads or immediate exits; verify timing source before treating it as zero engagement.");
assertIncludes("region demand helper", regionDemandHelper, "buildAdminAnalyticsRegionDemandModel");
assertIncludes("region demand helper", regionDemandHelper, "Raw geography with internal/admin traffic separated from external demand.");
assertIncludes("region demand helper", regionDemandHelper, "Adjusted demand excludes proven admin-surface traffic only.");
assertIncludes("region demand helper", regionDemandHelper, "route-level admin exclusion did not hydrate");
assertIncludes("region demand helper", regionDemandHelper, "Unknown city/country is a data-quality bucket");

assertIncludes("audience component", component, "data-audience-source-state");
assertIncludes("audience component", component, "resolveAdminAnalyticsGuestEstimateBadgeLabel");
assertIncludes("audience component", component, "buildAdminAnalyticsReturnCadenceBuckets");
assertIncludes("audience component", component, "data-audience-ga-freshness");
assertIncludes("audience component", component, "data-audience-first-party-freshness");
assertIncludes("audience component", component, "data-audience-missing-days-count");
assertIncludes("audience component", component, "data-audience-recent-gap-days-count");
assertIncludes("audience component", component, "data-audience-recovery-mode");
assertIncludes("audience component", component, "data-audience-estimated-share");
assertIncludes("audience component", component, "data-audience-generated-at-utc");
assertIncludes("audience component", component, "data-return-cadence-source-truth");
assertIncludes("audience component", component, "data-return-cadence-tracked-users");
assertIncludes("audience component", component, "data-return-cadence-generated-at-utc");
assertIncludes("audience component", component, "Tracked Auth Users");
assertIncludes("audience component", component, "No verified zero should be displayed");
assertNotIncludes("audience component", component, "bucket.count / returnCadenceModel.trackedAuthenticatedUsers");
assertNotIncludes("audience component", component, "const guestBadgeLabel = audienceSnapshotModel.guestEstimateFormulaUsed");
assertIncludes("return cadence helper", returnCadenceHelper, "Return cadence is using identified activity fallback because the cadence snapshot has not hydrated.");
assertIncludes("audience component", component, "label=\"GA4 Users\"");
assertIncludes("audience component", component, "Guest estimate");
assertIncludes("audience component", component, "First-party continuity");
assertIncludes("audience component", component, "Recovery");
assertIncludes("audience component", component, "Source mix: GA4 site users; views are mixed site analytics and first-party snapshots.");
assertIncludes("audience component", component, "Chart source: Site users plus site views.");
assertIncludes("audience component", component, "data-device-mix-source-truth");
assertIncludes("audience component", component, "data-device-mix-freshness");
assertIncludes("audience component", component, "data-device-mix-total-sessions");
assertIncludes("audience component", component, "data-device-mix-unknown-sessions");
assertIncludes("audience component", component, "Total sessions:");
assertIncludes("audience component", component, "Engagement: {deviceMixModel.engagementDefinition}");
assertIncludes("audience component", component, "Purchase rate, unwrap rate, bounce rate, average session length, and watch time by device are unavailable");
assertIncludes("audience component", component, "data-top-paths-source-truth");
assertIncludes("audience component", component, "data-top-paths-total-count");
assertIncludes("audience component", component, "data-top-paths-page-size");
assertIncludes("audience component", component, "Search path");
assertIncludes("audience component", component, "Filter");
assertIncludes("audience component", component, "Page size");
assertIncludes("audience component", component, "Percent column: Engagement");
assertIncludes("audience component", component, "Top 25 snapshot only");
assertIncludes("audience component", component, "No paths match the current search/filter selection.");
assertIncludes("audience component", component, "data-regions-source-truth");
assertIncludes("audience component", component, "data-regions-filter-mode");
assertIncludes("audience component", component, "data-regions-count-unit");
assertIncludes("audience component", component, "Raw geography with internal/admin traffic separated from external demand.");
assertIncludes("audience component", component, "External demand");
assertIncludes("audience component", component, "Admin/internal excluded");
assertIncludes("audience component", component, "Unknown location");
assertIncludes("audience component", component, "Internal/admin:");
assertIncludes("audience component", component, "Adjusted external");
assertNotIncludes("audience component", component, "label=\"Active Users\"");

assertIncludes("admin analytics contracts", contracts, "\"return_cadence\"");
assertIncludes("admin analytics contracts", contracts, "resolveAdminAnalyticsGuestEstimateBadgeLabel");
assertIncludes("admin analytics contracts", contracts, "buildAdminAnalyticsReturnCadenceBuckets");

assertIncludes("debug route", debugRoute, "adminAnalyticsAudienceSnapshot");
assertIncludes("debug route", debugRoute, "guestEstimateMetadata.formula");
assertIncludes("debug route", debugRoute, "\"continuity\"");
assertIncludes("debug route", debugRoute, "\"recovery\"");

assertIncludes("agent truth doc", doc, "GA users: total users reported by Google Analytics");
assertIncludes("agent truth doc", doc, "Estimated guest visits");
assertIncludes("agent truth doc", doc, "Future agents must not display authenticated-only");

assertNotIncludes("audience component", component, "Waiting for first snapshot");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Analytics Audience Snapshot contract check passed.");
