import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const previewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const previewModal = readRequired("src/components/DropPreviewModal.tsx");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const adminHistoricalRoute = readRequired("src/app/api/admin/analytics/historical/route.ts");
const adminAnalyticsCommerceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const topDropConversionHelper = readRequired("src/lib/admin-analytics-top-drop-conversion.ts");
const adminUserRoute = readRequired("src/app/api/admin/user/[userId]/route.ts");
const adminUsersRoute = readRequired("src/app/api/admin/users/route.ts");

if (packageJson.scripts?.["check:unlock-telemetry-truth"] !== "tsx scripts/agent/validate-unlock-telemetry-truth.ts") {
  failures.push("package.json must expose check:unlock-telemetry-truth.");
}

requireIncludes(unlockRoute, 'trackServerEvent("drop_unlocked"', "Drop unlock route");
requireIncludes(unlockRoute, 'trackServerEvent("drop_unwrapped"', "Drop unlock route legacy alias");
requireIncludes(unlockRoute, 'trackServerEvent("entitlement_granted"', "Drop unlock entitlement route");
requireIncludes(unlockRoute, 'entitlement_id: result.entitlementId', "Drop unlock route entitlement id telemetry");
requireIncludes(unlockRoute, 'transaction_id: result.transactionId', "Drop unlock route transaction id telemetry");
requireIncludes(unlockRoute, 'idempotency_key: `drop_unlocked:${userId}:${dropId}:${result.transactionId || result.entitlementId}`', "Drop unlock route idempotency telemetry");
requireIncludes(unlockRoute, 'source_component: "drops_unlock_route"', "Drop unlock route source component telemetry");
requireIncludes(unlockRoute, 'route: "/api/drops/unlock"', "Drop unlock route route telemetry");
requireIncludes(unlockRoute, 'sourceTruth: "server"', "Drop unlock route server truth");

requireIncludes(previewClient, 'trackEvent("drop_unlock_attempted"', "Locked drop preview client");
requireIncludes(previewClient, 'trackEvent("drop_preview_unlock_success_state_viewed"', "Locked drop preview client success UI context");
requireIncludes(previewClient, 'sourceTruth: "client_supporting"', "Locked drop preview client supporting truth");
requireExcludes(previewClient, 'trackEvent("unlock_drop_success"', "Locked drop preview client");
requireExcludes(dropCard, "trackEvent('unlock_drop_success'", "Drop card");
requireExcludes(previewModal, 'trackEvent("unlock_drop_success"', "Legacy preview modal");

requireIncludes(telemetryCatalog, '{ eventName: "drop_unwrapped"', "Telemetry catalog drop unlock server fact");
requireIncludes(telemetryCatalog, '{ eventName: "entitlement_granted"', "Telemetry catalog entitlement fact");
requireIncludes(telemetryCatalog, 'entitlementId: "entitlement_id"', "Telemetry catalog entitlement id alias");

requireIncludes(identifiedIngestRoute, 'canonicalEventName === "drop_unlocked" || canonicalEventName === "drop_unwrapped" || canonicalEventName === "entitlement_granted"', "Identified ingest unlock server truth");
requireIncludes(identifiedIngestRoute, 'if (canonicalEventName === "unlock_drop_success") {', "Identified ingest legacy client unlock demotion");

requireIncludes(adminHistoricalRoute, 'const telemetryUnlockCount = Math.max(', "Admin historical unlock telemetry aggregation");
requireIncludes(adminHistoricalRoute, 'canonicalEventCounts.drop_unwrapped || 0', "Admin historical unlock parity must read canonical unlock facts");
requireIncludes(adminHistoricalRoute, 'canonicalEventCounts.entitlement_granted || 0', "Admin historical unlock parity must read entitlement facts");
requireIncludes(adminHistoricalRoute, "topDropConversionState", "Admin historical Top Drop Conversion source state");
requireIncludes(adminHistoricalRoute, 'numeratorLabel: "unwraps"', "Admin historical Top Drop Conversion display numerator");
requireIncludes(adminAnalyticsCommerceTab, "Drops with enough views to evaluate unwrap conversion.", "Admin analytics Top Drop Conversion panel");
requireIncludes(adminAnalyticsCommerceTab, "data-top-drop-conversion-identity-state", "Admin analytics Top Drop Conversion identity truth");
requireIncludes(adminAnalyticsCommerceTab, "drop.unwrapRateDisplay", "Admin analytics Top Drop Conversion precision display");
requireExcludes(adminAnalyticsCommerceTab, "Unlocked drops with enough demand to matter.", "Admin analytics Top Drop Conversion panel");
requireExcludes(adminAnalyticsCommerceTab, "name=\"Unlocks\"", "Admin analytics Top Drop Conversion chart");
requireIncludes(topDropConversionHelper, "formatTopDropUnwrapRate", "Top Drop Conversion helper");
requireIncludes(topDropConversionHelper, "\"<0.1%\"", "Top Drop Conversion helper");
requireIncludes(topDropConversionHelper, "dropIdentityState", "Top Drop Conversion helper");
requireIncludes(adminUserRoute, 'const directUnwrapCount = analyticsFacts.filter((event) => event.eventName === "drop_unwrapped").length;', "Admin user route server unlock fact count");
requireIncludes(adminUsersRoute, 'current.unwrapCount += eventName === "drop_unwrapped" ? 1 : 0;', "Admin users route server unlock aggregation");

if (failures.length > 0) {
  console.error("Unlock telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Unlock telemetry truth validator passed.");
