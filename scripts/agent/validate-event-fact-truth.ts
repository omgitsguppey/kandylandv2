import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const contract = read("src/lib/behavioral/event-fact-contract.ts");
const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
const rollup = read("src/lib/server/event-fact-rollup.ts");
const taxonomy = read("src/lib/analytics-action-taxonomy.ts");
const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
const anonymousIngest = read("src/app/api/analytics/ingest/route.ts");
const analyticsMetrics = read("src/lib/server/analytics-metrics.ts");
const behavioralRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const doc = read("docs/agent-truth/event-fact-truth.md");

const requiredActions = [
  "onboarding_completed",
  "daily_checkin_claimed",
  "drop_viewed",
  "drop_preview_opened",
  "drop_unwrapped",
  "file_viewed",
  "watch_session_completed",
  "gumdrops_purchased",
  "creator_followed",
  "notification_opened",
  "support_ticket_created",
  "chat_message_sent",
];

requiredActions.forEach((action) => {
  assert(contract.includes(`"${action}"`), `Missing canonical behavioral action: ${action}`);
});

assert(contract.includes("BehavioralEventFact"), "Behavioral event fact contract is missing.");
assert(contract.includes("dedupeKey"), "Behavioral event fact contract is missing dedupeKey.");
assert(contract.includes("onboarding_completed: 24 * 60 * 60 * 1000"), "Onboarding dedupe window is wrong.");
assert(contract.includes("daily_checkin_claimed: 20 * 60 * 60 * 1000"), "Daily check-in dedupe window is wrong.");
assert(contract.includes('drop_unwrapped: "permanent"'), "Drop unwrap dedupe must be permanent.");
assert(contract.includes('gumdrops_purchased: "event_id"'), "GumDrops purchase dedupe must be event-id based.");
assert(contract.includes('chat_message_sent: "event_id"'), "Chat message dedupe must be event-id based.");

assert(normalizer.includes("normalizeBehavioralEventFactWithDiagnostics"), "Behavioral event fact normalizer is missing diagnostics support.");
assert(normalizer.includes("unknown_event_name"), "Unknown events are not routed to diagnostics.");
assert(normalizer.includes("normalizeTelemetryEventName"), "Behavioral event facts do not canonicalize telemetry aliases.");
assert(rollup.includes("unknownEvents"), "Event fact rollup does not surface unknown events.");

assert(taxonomy.includes("BEHAVIORAL_NORMALIZED_ACTIONS"), "Legacy action taxonomy does not reuse canonical event facts.");
assert(identifiedIngest.includes("normalizeBehavioralEventFact"), "Identified ingest does not use behavioral event facts.");
assert(identifiedIngest.includes("behavioralEventFactVersion"), "Identified ingest does not persist behavioral event fact metadata.");
assert(anonymousIngest.includes("buildBehavioralEventFactRollup"), "Anonymous ingest does not build behavioral event facts.");
assert(anonymousIngest.includes("unknownBehavioralEvents"), "Anonymous ingest does not persist unknown event diagnostics.");
assert(!anonymousIngest.includes("event.targetId || event.semanticSurfaceKey || event.type"), "Anonymous ingest is still using the old low-signal normalization chain.");

assert(userDetailRoute.includes("buildBehavioralEventFactRollup"), "Admin user detail route does not use canonical event facts.");
assert(userDetailRoute.includes("actionTaxonomyVersion: BEHAVIORAL_EVENT_FACT_VERSION"), "Admin user detail route is not exposing the canonical event fact version.");
assert(userDetailPage.includes("Raw event:"), "Action Ledger no longer collapses raw event names under debug details.");

assert(analyticsMetrics.includes("normalizeBehavioralEventFact"), "Analytics metrics do not use behavioral event facts.");
assert(behavioralRuntime.includes("readNormalizedAction"), "Behavioral intelligence runtime does not prefer normalized event facts.");
assert(behavioralRuntime.includes("normalizedAction === \"gumdrops_purchased\""), "Behavioral intelligence runtime still counts purchases from raw names only.");

assert(doc.includes("Unknown events go to diagnostics"), "Event fact doctrine does not document unknown-event diagnostics.");
assert(doc.includes("legacy"), "Event fact doctrine does not document legacy fallback labeling.");

console.log("Behavioral event fact truth validator passed.");
