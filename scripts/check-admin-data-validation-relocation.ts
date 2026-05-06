import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`[admin-data-validation-relocation] ${message}`);
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

const operationsTab = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const audienceTab = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const commerceTab = read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const analyticsHook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const debugComponent = read("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx");
const debugTab = read("src/app/admin/debug/components/DebugTabAdvanced.tsx");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const validationBuilder = read("src/lib/server/admin-analytics-historical-validation.ts");
const types = read("src/types/admin-analytics.ts");
const doc = read("docs/agent-truth/admin-data-validation.md");

assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, 'title="Data Validation"');
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "validationItems.map");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "canonical authenticated events");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "canonical purchase rollups");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "analytics pipeline failures");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "legacy-history support sources");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "truth score");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "dataValidationRange");
assertNotIncludes("AdminAnalyticsOperationsTab", operationsTab, "getValidationClasses");
assertNotIncludes("AdminAnalyticsAudienceTab", audienceTab, "dataValidationRange");
assertNotIncludes("AdminAnalyticsCommerceTab", commerceTab, "dataValidationRange");
assertNotIncludes("useAdminAnalyticsState", analyticsHook, "useHistoricalSectionOverride(\r\n    \"dataValidation\"");
assertNotIncludes("useAdminAnalyticsState", analyticsHook, "validationItems");

assertIncludes("DebugAdvancedDataValidation", debugComponent, "DebugAdvancedDataValidation");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "/api/admin/analytics/historical?section=dataValidation&period=30d");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "data?.dataValidation ?? buildFallbackPanelState(data)");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "status: \"not_validated\"");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Validation has not run for this range yet.");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Validation failed. Retry the validation route or inspect admin analytics historical route errors.");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "cacheState === \"unknown\" ? \"UNKNOWN\"");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "badgeLabel={panelState.lastValidatedAtUtc ? \"INFO\" : \"NOT VALIDATED\"}");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Analytics source health");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Commerce parity");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Unlock/watch parity");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Onboarding/task parity");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "Pass allowed");
assertIncludes("DebugAdvancedDataValidation", debugComponent, "passBlockedReason");
assertNotIncludes("DebugAdvancedDataValidation", debugComponent, "validations.length || (isLoading ? \"Loading\" : 0)");
assertNotIncludes("DebugAdvancedDataValidation", debugComponent, "tone={summary.failCount > 0 ? \"bad\" : \"good\"}");
assertIncludes("DebugTabAdvanced", debugTab, "<DebugAdvancedDataValidation />");

for (const required of [
  "checkKey",
  "source",
  "selectedRange",
  "lastValidatedAt",
  "freshnessState",
  "confidence",
  "requiredSourcesPresent",
  "sampleRequired",
  "sampleCount",
  "passAllowed",
  "passBlockedReason",
  "action",
  "fullDetails",
]) {
  assertIncludes("validation builder", validationBuilder, required);
  assertIncludes("ValidationItem type", types, required);
}

assertIncludes("validation builder", validationBuilder, "required_sample_missing");
assertIncludes("validation builder", validationBuilder, "stale_validation");
assertIncludes("validation builder", validationBuilder, "input.status === \"pass\" && !passAllowed");
assertIncludes("validation builder", validationBuilder, "telemetryLogCount > 0 && input.firstPartyAuthenticatedEvents > 0");
assertIncludes("validation builder", validationBuilder, "input.taskGuidance.viewed === 0 && input.taskGuidance.tapped === 0 && input.taskGuidance.completed === 0");
assertIncludes("validation builder", validationBuilder, "purchase_revenue_truth");
assertIncludes("validation builder", validationBuilder, "purchase_funnel_telemetry");
assertIncludes("validation builder", validationBuilder, "unlock_parity");
assertIncludes("validation builder", validationBuilder, "pipeline_health");
assertIncludes("validation builder", validationBuilder, "module_coverage");

assertIncludes("AdminDebugRoute", debugRoute, "adminDataValidation");
assertIncludes("AdminDebugRoute", debugRoute, "dataValidationMovedFromAnalytics: true");
assertIncludes("AdminDebugRoute", debugRoute, "analyticsValidationSectionRemoved: true");
assertIncludes("AdminDebugRoute", debugRoute, "debugValidationSurfacePath");
assertIncludes("AdminDebugRoute", debugRoute, "passAllowed");

assertIncludes("agent truth doc", doc, "Data Validation belongs in Admin Debug");
assertIncludes("agent truth doc", doc, "PASS is forbidden");
assertIncludes("agent truth doc", doc, "Stale validation must not appear as a live pass");
assertIncludes("agent truth doc", doc, "Future agents must not reintroduce the full Data Validation card list");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Admin Data Validation relocation contract check passed.");
