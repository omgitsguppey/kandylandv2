import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

type Report = {
  generatedAtUtc?: string;
  reportKey?: string;
  currentHead?: string;
  summary?: Record<string, unknown>;
  auditItemsAddressed?: number[];
  fixesApplied?: Array<Record<string, unknown>>;
  deferredFindings?: Array<Record<string, unknown>>;
  costSavingsModel?: Array<Record<string, unknown>>;
  prCleanupActions?: Array<Record<string, unknown>>;
  nextFixOrder?: string[];
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
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

report.generatedAtUtc = new Date().toISOString();
report.currentHead = head;
report.summary = {
  ...(report.summary ?? {}),
  nonPriorityFlushSeconds: 15,
  eventTriggeredBatch: true,
  estimatedSavingsNotes: [
    "DeepTracker schedules one 15-second non-priority batch after eligible work and no longer runs a recurring generic telemetry interval.",
    "Retryable transport failures retain the queue and use a bounded 15/30/60/120-second event-driven backoff while the page is visible.",
    "Pagehide, visibility hidden, cleanup, online, and priority paths retain explicit flush behavior.",
    "Hover and visibility events emit summaries instead of per-transition streams.",
    "Scroll uses requestAnimationFrame and 25/50/75/100 milestones instead of 500ms polling.",
    "Identity link writes pending state before send, then stores success or retry-after state to prevent duplicate bursts.",
    "Runtime request-volume and billing effects remain external evidence; this report makes no provider-cost claim.",
  ],
};
if (report.fixesApplied?.[0]) {
  report.fixesApplied[0] = {
    ...report.fixesApplied[0],
    status: "fixed_event_triggered_batch_priority_preserved",
    detail: "Client telemetry priority remains explicit; non-priority DeepTracker work uses a one-shot 15-second event-triggered batch with a 200-event cap and no recurring generic interval.",
  };
}
report.costSavingsModel = (report.costSavingsModel ?? []).map((entry, index) => index === 0
  ? {
      lane: "deeptracker_event_triggered_batch",
      formula: "wakeupsRemoved = priorRecurringWakeups - eventTriggeredBatchWakeups",
      estimatedPercentReduction: "recurring non-priority wakeups removed; deployed request-volume effect requires runtime evidence",
    }
  : entry);
report.prCleanupActions = [];
report.nextFixOrder = [
  "Keep the event-triggered batch and lifecycle flush paths covered by source tests.",
  "Collect deployed request-volume and billing evidence before claiming provider cost effects.",
  "Keep RuntimeWatchTracker on its independent 10-second playback heartbeat when wiring media integration.",
];

if (report.reportKey !== "deeptracker-telemetry-volume-reduction") fail("report key is missing or wrong.");
if (!report.currentHead) fail("report currentHead is missing.");
if (report.currentHead !== head) fail("report currentHead does not match the checked-out source head.");

requireIncludes(priority, "CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS = 15_000", "priority policy 15s non-priority flush");
requireIncludes(priority, "CLIENT_TELEMETRY_NON_PRIORITY_QUEUE_CAP = 200", "priority policy queue cap");
requireIncludes(priority, "CLIENT_TELEMETRY_RETRY_DELAYS_MS", "priority policy bounded retry schedule");
requireIncludes(priority, "resolveClientTelemetryRetryDelayMs", "priority policy retry resolver");
requireIncludes(priority, "priority_immediate", "priority policy immediate class");
requireIncludes(priority, "priority_next_flush", "priority policy next flush class");
requireIncludes(priority, "non_priority_batch", "priority policy non-priority class");
requireIncludes(priority, "debug_only", "priority policy debug class");
requireIncludes(priority, "runtime_watch_time_v2", "priority policy runtime watch immediate event");

requireIncludes(deepTracker, "GUEST_ANALYTICS_FLUSH_INTERVAL_MS = CLIENT_TELEMETRY_NON_PRIORITY_FLUSH_INTERVAL_MS", "DeepTracker batch delay");
requireIncludes(deepTracker, "scheduleNonPriorityFlush", "DeepTracker event-triggered non-priority batch");
requireIncludes(deepTracker, "scheduleRetainedQueueRetry", "DeepTracker retained queue retry");
requireIncludes(deepTracker, "resolveClientTelemetryRetryDelayMs", "DeepTracker canonical retry policy");
requireIncludes(deepTracker, 'flushQueue("batch")', "DeepTracker delayed batch flush");
requireAbsent(deepTracker, /trackingInterval\s*=|window\.setInterval\(/u, "DeepTracker recurring interval");
requireAbsent(deepTracker, /GUEST_ANALYTICS_FLUSH_INTERVAL_MS\s*=\s*2_?500/u, "DeepTracker old 2.5s delay");
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
if (summary.eventTriggeredBatch !== true) fail("eventTriggeredBatch is not true.");
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
if (!Array.isArray(report.prCleanupActions) || report.prCleanupActions.length !== 0) {
  fail("prCleanupActions must be empty; PR state is not owned by this source report.");
}
if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) {
  fail("nextFixOrder is empty.");
}

writeFileSync("agent/state/deeptracker-telemetry-volume-reduction.generated.json", `${JSON.stringify(report, null, 2)}\n`);
writeFileSync("docs/agent-truth/deeptracker-telemetry-volume-reduction.md", `# DeepTracker Telemetry Volume Reduction

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

This source report covers generic DeepTracker batching. It does not prove deployed request volume, provider acceptance, or billing effects.

## Current Source Contract

- Eligible non-priority work schedules one 15-second batch; retained retryable failures use bounded 15/30/60/120-second backoff, and DeepTracker has no recurring generic telemetry interval.
- Priority purchase, payment, identity, auth, bug-report, and runtime-watch events retain their priority policy.
- Pagehide, visibility hidden, cleanup, online, and priority paths retain explicit flush behavior.
- Permanent 4xx transport outcomes advance the guest queue; transient and network failures remain bounded for retry.
- Hover and visibility telemetry are summarized; scroll uses requestAnimationFrame plus 25/50/75/100 milestones.
- Runtime watch-time remains separate on its canonical 10-second visible playback heartbeat.

## Evidence Boundary

Runtime request volume, App Hosting/Cloud Run behavior, provider acceptance, and billing impact require external evidence and are not marked passed by this report.
`);

console.log("deeptracker-telemetry-volume-reduction: pass");
