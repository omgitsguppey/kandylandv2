import { readFileSync } from "node:fs";

type Report = {
  reportKey?: string;
  currentHead?: string;
  summary?: Record<string, unknown>;
  auditItemsAddressed?: number[];
  costSavingsModel?: Array<Record<string, unknown>>;
  prCleanupActions?: Array<Record<string, unknown>>;
  nextFixOrder?: unknown[];
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function fail(message: string): never {
  console.error(`deeptracker-telemetry-volume-reduction: ${message}`);
  process.exit(1);
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} missing ${needle}`);
  }
}

function requireAbsent(source: string, pattern: RegExp, label: string) {
  if (pattern.test(source)) {
    fail(`${label} contains forbidden ${pattern}`);
  }
}

const deepTracker = read("src/components/Analytics/DeepTracker.tsx");
const priority = read("src/lib/analytics/client-telemetry-priority.ts");
const identityLink = read("src/lib/analytics/analytics-identity-link.ts");
const runtimeWatchTracker = read("src/components/Analytics/RuntimeWatchTracker.tsx");
const runtimeWatchModel = read("src/lib/analytics/runtime-watch-time-v2.ts");
const report = JSON.parse(read("agent/state/deeptracker-telemetry-volume-reduction.generated.json")) as Report;

if (report.reportKey !== "deeptracker-telemetry-volume-reduction") fail("report key is missing or wrong.");
if (!report.currentHead) fail("report currentHead is missing.");

requireIncludes(priority, "CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS = 15_000", "priority policy 15s non-priority flush");
requireIncludes(priority, "CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP = 200", "priority policy queue cap");
requireIncludes(priority, "priority_immediate", "priority policy immediate class");
requireIncludes(priority, "priority_next_flush", "priority policy next flush class");
requireIncludes(priority, "non_priority_batch", "priority policy non-priority class");
requireIncludes(priority, "debug_only", "priority policy debug class");
requireIncludes(priority, "runtime_watch_time_v2", "priority policy runtime watch immediate event");

requireIncludes(deepTracker, "GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS", "DeepTracker flush interval");
requireAbsent(deepTracker, /GUEST_ANALYTICS_FLUSH_INTERVAL_MS\s*=\s*2_?500/u, "DeepTracker old 2.5s interval");
requireIncludes(deepTracker, "trimNonPriorityQueueForEvent", "DeepTracker priority queue trim helper");
requireIncludes(deepTracker, "queuedPriority !== \"non_priority_batch\"", "DeepTracker priority cap guard");
requireIncludes(deepTracker, "shouldFlushClientTelemetryOnNextTurn", "DeepTracker priority next-turn flush");
requireIncludes(deepTracker, "finalCloseoutKeyRef", "DeepTracker finalization closeout key");
requireIncludes(deepTracker, "preferBeacon: true", "DeepTracker beacon finalization");
requireIncludes(deepTracker, "hoverSummaryRef", "DeepTracker hover summary");
requireIncludes(deepTracker, "visibilitySummaryRef", "DeepTracker visibility summary");
requireIncludes(deepTracker, "SCROLL_MILESTONES", "DeepTracker scroll milestones");
requireIncludes(deepTracker, "[25, 50, 75, 100]", "DeepTracker scroll milestone values");
requireIncludes(deepTracker, "requestAnimationFrame", "DeepTracker scroll rAF throttle");
requireAbsent(deepTracker, /now - lastScrollTime > 500/u, "DeepTracker 500ms scroll polling");
requireAbsent(deepTracker, /GUEST_ANALYTICS_MAX_HOVER_EVENTS_PER_SESSION\s*=\s*12/u, "DeepTracker hover event spam cap");
requireAbsent(deepTracker, /GUEST_ANALYTICS_MAX_VISIBILITY_EVENTS_PER_SESSION\s*=\s*24/u, "DeepTracker visibility event spam cap");

requireIncludes(identityLink, "IDENTITY_LINK_PENDING_TTL_MS", "identity link pending TTL");
requireIncludes(identityLink, "markIdentityLinkSubmitted(link, storage)", "identity link mark before send");
requireIncludes(identityLink, "markIdentityLinkSucceeded(link, storage)", "identity link success marker");
requireIncludes(identityLink, "markIdentityLinkRetryAfter(link, storage)", "identity link retry marker");
requireIncludes(identityLink, "retry_after:", "identity link retry-after state");

requireIncludes(runtimeWatchModel, "RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS = 10_000", "runtime watch heartbeat");
requireIncludes(runtimeWatchTracker, "RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS", "runtime watch tracker heartbeat import");
requireAbsent(runtimeWatchTracker, /CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS/u, "runtime watch tracker generic flush coupling");

const expectedItems = [1, 2, 3, 4, 5, 6, 14];
if (JSON.stringify(report.auditItemsAddressed) !== JSON.stringify(expectedItems)) {
  fail("auditItemsAddressed does not match requested phase items.");
}

const summary = report.summary ?? {};
if (summary.nonPriorityFlushSeconds !== 15) fail("nonPriorityFlushSeconds is not 15.");
if (summary.nonPriorityQueueCap !== 200) fail("nonPriorityQueueCap is not 200.");
for (const key of [
  "priorityEventsPreserved",
  "finalizationCoalesced",
  "hoverSummarized",
  "visibilitySummarized",
  "scrollMilestonesOnly",
  "identityLinkDuplicateGuarded",
  "runtimeWatchUnaffected",
]) {
  if (summary[key] !== true) fail(`summary.${key} is not true.`);
}

if (!Array.isArray(report.costSavingsModel) || report.costSavingsModel.length === 0) {
  fail("costSavingsModel is empty.");
}
if (/\$\d/u.test(JSON.stringify(report))) {
  fail("report claims dollar savings without billing evidence.");
}
if (!Array.isArray(report.prCleanupActions) || report.prCleanupActions.length === 0) {
  fail("prCleanupActions is empty.");
}
if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) {
  fail("nextFixOrder is empty.");
}

console.log("deeptracker-telemetry-volume-reduction: pass");
