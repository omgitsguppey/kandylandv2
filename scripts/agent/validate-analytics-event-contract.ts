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

const contract = readRequired("src/lib/analytics/analytics-event-contract.ts");
const legacyMapper = readRequired("src/lib/analytics/legacy-event-mapping.ts");
const clientSession = readRequired("src/lib/client-session.ts");
const telemetrySafety = readRequired("src/lib/telemetry-safety.ts");
const telemetry = readRequired("src/lib/telemetry.ts");
const catalog = readRequired("src/lib/telemetry-catalog.ts");
const legacyDoc = readRequired("docs/agent-truth/analytics-legacy-recovery.md");
const truthDoc = readRequired("docs/agent-truth/analytics-truth-layer-v2.md");
const actorDoc = readRequired("docs/agent-truth/analytics-actor-taxonomy.md");
const sourceDoc = readRequired("docs/agent-truth/analytics-source-hierarchy.md");
const guestDoc = readRequired("docs/agent-truth/guest-user-analytics-cutover.md");

for (const field of [
  "eventId",
  "eventName",
  "eventVersion",
  "occurredAt",
  "receivedAt",
  "actorType",
  "anonymousVisitorId",
  "sessionId",
  "userId",
  "creatorId",
  "adminId",
  "actorUserId",
  "actorCreatorId",
  "actorAdminId",
  "targetUserId",
  "targetCreatorId",
  "surface",
  "route",
  "component",
  "objectType",
  "objectId",
  "source",
  "consentState",
  "dedupeKey",
  "schemaVersion",
  "legacySource",
  "legacyId",
  "legacyConfidence",
  "mappingWarnings",
]) {
  requireIncludes(contract, field, "Canonical event contract");
}

for (const actorType of ["guest", "user", "creator", "admin", "system", "unknown"]) {
  requireIncludes(contract, `"${actorType}"`, "Canonical actor type list");
  requireIncludes(actorDoc, actorType, "Actor taxonomy doc");
}

for (const helper of [
  "classifyAnalyticsActor",
  "createIdentityLinkedEvent",
  "shouldExcludeFromUserAnalytics",
  "shouldIncludeInAdminAnalytics",
  "shouldIncludeInGlobalEvents",
  "explainEventInclusion",
  "buildAnalyticsEventDebugMetadata",
  "buildAnalyticsDedupeKey",
]) {
  requireIncludes(contract, helper, "Analytics event contract helpers");
}

for (const identityHelper of [
  "getAnonymousVisitorId",
  "getClientAnalyticsIdentitySnapshot",
  "buildClientIdentityLinkRecord",
  "rememberClientIdentityLink",
]) {
  requireIncludes(clientSession, identityHelper, "Client session identity helper");
}

requireIncludes(contract, "Unknown actor events are excluded", "Unknown actor user-lane exclusion");
requireIncludes(contract, "Admin events are excluded", "Admin user-lane exclusion");
requireIncludes(contract, "System events are excluded", "System user-lane exclusion");
requireIncludes(contract, "globalEventsPreserveActorClassification", "Global event actor preservation");
requireIncludes(contract, "fakeZeroPrevention", "Fake zero prevention debug placeholder");
requireIncludes(contract, "identity_linked", "Identity link event");

for (const eventName of [
  "page_viewed",
  "drop_preview_opened",
  "drop_clicked",
  "viewer_opened",
  "viewer_asset_consumed",
  "unlock_drop_success",
  "begin_checkout",
  "gumdrops_purchase_completed",
  "wallet_opened",
  "wallet_closed_incomplete",
  "auth_modal_opened",
  "auth_sign_up_success",
  "auth_sign_in_success",
  "onboarding_started",
  "onboarding_step_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "task_assigned",
  "task_started",
  "task_completed",
  "task_failed",
  "daily_reward_claimed",
  "notification_prompted",
  "notification_enabled",
  "notification_sent",
  "notification_opened",
  "notification_read",
  "notification_cleared",
  "notification_duplicate_prevented",
  "queued_drop_returned_live",
  "identity_linked",
  "admin_action_performed",
  "system_job_ran",
]) {
  requireIncludes(catalog, `"${eventName}"`, "Telemetry catalog canonical event or compatibility alias");
}

for (const legacyItem of [
  "Firestore `analytics_event_facts`",
  "Firestore `analytics_guest_batches`",
  "Firestore `daily_task_events`",
  "Notification records",
  "Onboarding state",
  "RTDB presence",
  "GA4 / BigQuery daily",
  "GA4 / BigQuery intraday",
  "Admin audit records",
]) {
  requireIncludes(legacyDoc, legacyItem, "Legacy recovery doc");
}

for (const mapperItem of [
  "legacySource",
  "legacyConfidence",
  "mappingWarnings",
  "legacy_directional_only",
  "mapLegacyAnalyticsRecordToCanonical",
  "unmapped",
]) {
  requireIncludes(legacyMapper, mapperItem, "Legacy event mapper");
}

requireIncludes(truthDoc, "Phase 2 Canonical Event Spine", "Analytics truth layer doc");
requireIncludes(truthDoc, "identity_linked", "Analytics truth layer doc");
requireIncludes(sourceDoc, "Phase 2 Dedupe and Idempotency Rule", "Analytics source hierarchy doc");
requireIncludes(sourceDoc, "Random browser ids can remain `eventId`, but they must not be the only idempotency control", "Analytics source hierarchy doc");

for (const hygieneNeedle of [
  "sanitizeTelemetryParamsForGa4",
  "sanitizeTelemetryParamsForBackend",
  "value === null || typeof value === \"undefined\"",
]) {
  requireIncludes(telemetrySafety, hygieneNeedle, "Telemetry sanitizer hygiene");
}

for (const guestHygieneNeedle of [
  "GA4 user_id hygiene",
  "Never send `user_id` for never-signed-in guests.",
  "Never send blank, whitespace, `\"null\"`, `\"NULL\"`, `\"undefined\"`, or `\"UNDEFINED\"` as `user_id`.",
]) {
  requireIncludes(guestDoc, guestHygieneNeedle, "Guest analytics GA4 user_id doctrine");
}

requireIncludes(telemetry, "syncIdentifiedTelemetryOwnership(userId: string | null)", "Telemetry ownership reset");
requireIncludes(telemetry, "if (!userId)", "Telemetry signout ownership clear");
requireIncludes(telemetry, "telemetryQueueUserId = null", "Telemetry signout ownership clear");
requireIncludes(telemetry, "anonymous_visitor_id: identityLink.anonymousVisitorId ?? \"\"", "Identity link preserves guest lineage as backend param");
requireIncludes(telemetry, "user_id: identityLink.userId", "Identity link uses real assigned user id");

if (failures.length > 0) {
  console.error("Analytics event contract validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Analytics event contract validation passed.");
