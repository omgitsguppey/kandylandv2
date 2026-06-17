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
const adminViewAsContext = readRequired("src/context/AdminViewAsContext.tsx");
const syntheticViewAs = readRequired("src/lib/admin/synthetic-creators-view-as.ts");
const viewAsRoute = readRequired("src/app/api/admin/view-as-creator/route.ts");
const analyticsContract = readRequired("src/lib/analytics/analytics-event-contract.ts");
const identifiedIngest = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const telemetrySafety = readRequired("src/lib/telemetry-safety.ts");
const actorMarkers = readRequired("src/lib/identity/actor-markers.ts");
const eventFactNormalizer = readRequired("src/lib/behavioral/event-fact-normalizer.ts");
const behavioralNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const routeTests = readRequired("tests/unit/admin-view-as-creator-route.spec.ts");
const ingestTests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");
const contractTests = readRequired("tests/unit/analytics-event-contract.spec.ts");

if (packageJson.scripts?.["check:admin-projection-analytics-exclusion"] !== "tsx scripts/agent/validate-admin-projection-analytics-exclusion.ts") {
  failures.push("package.json must expose check:admin-projection-analytics-exclusion.");
}

requireIncludes(syntheticViewAs, "ADMIN_VIEW_AS_PERFORMED_AS", "Admin view-as helper");
requireIncludes(syntheticViewAs, "ADMIN_VIEW_AS_PROJECTION_MODE", "Admin view-as helper");
requireIncludes(syntheticViewAs, "ADMIN_VIEW_AS_SOURCE_TRUTH", "Admin view-as helper");
requireIncludes(syntheticViewAs, "ADMIN_PROJECTION_WRITE_BLOCKED_EVENT", "Admin projection blocked event helper");
requireIncludes(syntheticViewAs, "buildAdminViewAsTelemetryPayload", "Admin projection telemetry helper");
requireIncludes(syntheticViewAs, "actorAdminId", "Admin projection telemetry payload");
requireIncludes(syntheticViewAs, "performedAs: ADMIN_VIEW_AS_PERFORMED_AS", "Admin projection telemetry payload");
requireIncludes(syntheticViewAs, "includeInUserBehavior: false", "Admin projection telemetry payload");
requireIncludes(syntheticViewAs, "sourceTruth: ADMIN_VIEW_AS_SOURCE_TRUTH", "Admin projection telemetry payload");

requireIncludes(adminViewAsContext, "buildAdminViewAsTelemetryPayload", "AdminViewAsContext");
requireIncludes(adminViewAsContext, 'trackEvent("admin_view_as_creator_started"', "AdminViewAsContext start telemetry");
requireIncludes(adminViewAsContext, 'trackEvent("admin_view_as_creator_ended"', "AdminViewAsContext end telemetry");
requireExcludes(adminViewAsContext, "actorUid: user.uid", "AdminViewAsContext projection telemetry");

requireIncludes(viewAsRoute, '"admin_projection_write_blocked"', "Admin view-as route blocked event");
requireIncludes(viewAsRoute, "buildAdminViewAsTelemetryPayload", "Admin view-as route telemetry payload");
requireIncludes(viewAsRoute, "actorAdminId: caller.uid", "Admin view-as route actor admin id");
requireIncludes(viewAsRoute, "targetCreatorId: targetUserId", "Admin view-as route target creator id");
requireIncludes(viewAsRoute, "}, caller.uid)", "Admin view-as route must write analytics under the admin actor, not the target.");

requireIncludes(actorMarkers, "actorAdminId", "Actor marker telemetry payload");
requireIncludes(actorMarkers, "actor_admin_id", "Actor marker telemetry payload");
requireIncludes(telemetryCatalog, 'eventName: "admin_projection_write_blocked"', "Telemetry catalog admin projection blocked event");
requireIncludes(telemetryCatalog, 'aliases: ["admin_view_as_creator_action_blocked"]', "Telemetry catalog admin projection blocked alias");
requireIncludes(telemetryCatalog, 'return ["actor_admin_id|actorAdminId|admin_id|adminId", "performed_as|performedAs"]', "Telemetry catalog projection actor contract");
requireIncludes(telemetrySafety, '"performed_as"', "Telemetry safety projection priority fields");
requireIncludes(telemetrySafety, '"projection_mode"', "Telemetry safety projection priority fields");
requireIncludes(telemetrySafety, '"include_in_user_behavior"', "Telemetry safety projection priority fields");

requireIncludes(analyticsContract, "performedAs?: string | null", "Analytics contract projection input");
requireIncludes(analyticsContract, "projectionMode?: string | null", "Analytics contract projection input");
requireIncludes(analyticsContract, "sourceTruth?: string | null", "Analytics contract projection input");
requireIncludes(analyticsContract, "isAdminProjectionInput", "Analytics contract projection classifier");
requireIncludes(analyticsContract, "Admin projection/view-as events are excluded from user behavior analytics.", "Analytics contract projection exclusion reason");

requireIncludes(identifiedIngest, "normalizeIdentifiedRuntimeFact", "Identified ingest runtime fact normalizer");
requireIncludes(identifiedIngest, "sourceTruth: ingestRuntimeFact.sourceTruth", "Identified ingest runtime fact source truth propagation");
requireIncludes(identifiedIngest, "sourceTruth: parityFact.sourceTruth", "Identified ingest event document source truth propagation");
requireIncludes(identifiedIngest, "performedAs", "Identified ingest performedAs propagation");
requireIncludes(identifiedIngest, "projectionMode", "Identified ingest projection mode propagation");
requireIncludes(identifiedIngest, "ingestRuntimeFact.includeInUserBehavior && (!latestActiveUserPatch", "Identified ingest active user exclusion");
requireIncludes(eventFactNormalizer, '"local_projection"', "Identified metric source truth");
requireIncludes(eventFactNormalizer, "eventName.startsWith(\"admin_projection_\")", "Identified metric projection exclusion");
requireIncludes(behavioralNormalizer, "admin_projection_write_blocked", "Behavioral normalizer projection blocked action");

requireIncludes(routeTests, '"admin_projection_write_blocked"', "Admin view-as route tests");
requireIncludes(routeTests, 'actorAdminId: "admin_1"', "Admin view-as route tests");
requireIncludes(routeTests, 'includeInUserBehavior: false', "Admin view-as route tests");
requireIncludes(ingestTests, 'eventName: "admin_projection_write_blocked"', "Identified ingest projection tests");
requireIncludes(ingestTests, "activeUserWrite).toBeUndefined()", "Identified ingest active user exclusion test");
requireIncludes(contractTests, "keeps admin projection markers out of user behavior", "Analytics contract projection tests");

if (failures.length > 0) {
  console.error("Admin projection analytics exclusion validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin projection analytics exclusion validator passed.");
