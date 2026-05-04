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

const taxonomy = read("src/lib/analytics-action-taxonomy.ts");
const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
const anonymousIngest = read("src/app/api/analytics/ingest/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const analyticsMetrics = read("src/lib/server/analytics-metrics.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");

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
  assert(taxonomy.includes(`"${action}"`), `Missing user action taxonomy entry: ${action}`);
});

assert(taxonomy.includes("dedupeNormalizedUserActions"), "User action dedupe helper is missing.");
assert(taxonomy.includes("sourceComponent") && taxonomy.includes("route") && taxonomy.includes("entityId"), "Normalized action shape is missing required fields.");
assert(identifiedIngest.includes("normalizeUserAction"), "Identified ingest does not normalize user actions.");
assert(identifiedIngest.includes("normalizedActionName") && identifiedIngest.includes("normalizedActionId"), "Identified ingest does not persist normalized action metadata.");
assert(anonymousIngest.includes("normalizedActions") && anonymousIngest.includes("normalizedActionCount"), "Anonymous ingest does not record normalized action summary.");
assert(userDetailRoute.includes("actionLedger") && userDetailRoute.includes("toUserActionLedgerItem"), "Admin user detail route does not expose normalized action ledger.");
assert(userDetailRoute.includes("dedupeNormalizedUserActions"), "Admin user detail route does not dedupe normalized actions.");
assert(userDetailPage.includes("data-user-action-name") && userDetailPage.includes("action.label"), "Action Ledger UI does not render normalized action rows.");
assert(!userDetailPage.includes("{transaction.description || transactionType}"), "Action Ledger still displays raw transaction/event names as the primary row.");
assert(analyticsMetrics.includes("normalizeUserAction") && analyticsMetrics.includes("actionIds"), "Analytics metrics do not count normalized deduped actions.");
assert(telemetryCatalog.includes("TELEMETRY_USER_ACTION_TAXONOMY_NAMES"), "Telemetry catalog does not expose the user action taxonomy.");

console.log("User action ledger event normalization validator passed.");
