import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import {
  buildPersonMetricsHydrationReport,
  classifyPersonMetricsHydrationDirtyFile,
} from "@/lib/analytics/person-metrics-hydration";
import {
  PERSON_METRIC_DEFINITIONS,
  PERSON_METRIC_IDS,
} from "@/lib/analytics/person-metrics-contract";
import { buildLegacyEventRecoveryCandidate } from "@/lib/legacy/march-first-event-recovery";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/person-metrics-hydration.generated.json";
const DOC_PATH = "docs/agent-truth/person-metrics-hydration.md";

const SCORE_DIMENSION_KEYS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function trackedFiles() {
  return run("git", ["ls-files", "src", "scripts", "docs", "agent", "tests"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function envelope(eventName: string, index: number): CanonicalEventEnvelope {
  return {
    eventId: `person_metrics_validator:${eventName}:${index}`,
    eventName,
    eventVersion: 1,
    timestamp: "2026-05-23T05:00:00.000Z",
    featureId: "person_metrics_hydration_validator",
    surface: "agent_validator",
    actorKind: index % 7 === 0 ? "creator_user" : "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    consentMode: eventName.startsWith("watch_session") || eventName === "viewer_watch_checkpoint" ? "full_behavioral" : "minimal_analytics",
    sessionId: `validator_session_${index}`,
    guestId: null,
    userRef: { kind: "user", id: `user_${index}` },
    linkId: null,
    source: "system",
    materializerLane: "person_metrics",
    debugVisibility: "admin_debug",
    scoreImpact: "evidence_completeness",
    privacyClass: eventName.startsWith("watch_session") || eventName === "viewer_watch_checkpoint" ? "behavioral" : "minimal_product",
    metadata: {},
    pipelineStatus: "normal",
    unavailableGuestReason: null,
    includeInUserBehavior: true,
  };
}

function validationEnvelopes() {
  return PERSON_METRIC_DEFINITIONS.flatMap((metric, metricIndex) =>
    metric.eventNames.slice(0, 1).map((eventName, eventIndex) => envelope(eventName, metricIndex + eventIndex + 1)),
  );
}

function findActiveOldLogic() {
  const oldLogicPattern = /duplicated_person_metric|stale_user_metric|unknown_legacy.*became.*exact|checkout_start.*counts.*payment_success/iu;
  return trackedFiles().filter((path) => {
    if (!existsSync(join(ROOT, path))) return false;
    if (path === "scripts/agent/validate-person-metrics-hydration.ts") return false;
    if (path === "docs/agent-truth/person-metrics-hydration.md") return false;
    if (path === "tests/unit/person-metrics-hydration.spec.ts") return false;
    if (path === "src/lib/analytics/person-metrics-hydration.ts") return false;
    if (path === "agent/state/event-liveness-audit.generated.json") return false;
    if (path === "docs/agent-truth/event-liveness-audit.md") return false;
    if (path === "scripts/agent/validate-event-liveness-audit.ts") return false;
    if (path === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return false;
    if (path === "scripts/agent/validate-future-activity-signal-reclassification.ts") return false;
    if (path === "tests/unit/future-activity-signal-reclassification.spec.ts") return false;
    return oldLogicPattern.test(read(path));
  });
}

function renderDoc(report: Omit<ReturnType<typeof buildPersonMetricsHydrationReport>, "status"> & {
  status: "pass" | "review" | "fail";
  currentHead: string;
  dirtyFiles: Array<{ path: string; classification: string }>;
  activeOldLogic: string[];
  validationFailures: string[];
}) {
  const metricRows = PERSON_METRIC_IDS.map((metricId) => {
    const metric = report.metricStatus[metricId];
    return `- ${metricId}: state=${metric.state}; count=${metric.count}; confidence=${metric.confidence}; provenZero=${metric.provenZero}; missing=${metric.missingProducer ?? "none"}`;
  });
  const scoreRows = Object.entries(report.scoreImpactByDimension).map(([dimension, impact]) =>
    `- ${dimension}: before=${impact.before}; after=${impact.after}; ${impact.reason}`,
  );
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  return [
    "# Person Metrics Hydration",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.",
    "- Unknown legacy evidence never becomes exact user truth.",
    "- Checkout starts remain checkout intent, not payment approval.",
    "- Page duration never becomes watch time; watch sessions require runtime watch events.",
    "- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.",
    "",
    "## Debug Lane",
    "",
    `- Producers registered: ${report.debugLane.producersRegistered}`,
    `- Producers connected: ${report.debugLane.producersConnected}`,
    `- Event envelopes hydrated: ${report.debugLane.eventEnvelopesHydrated}`,
    `- Person metrics mapped: ${report.debugLane.personMetricsMapped}`,
    `- Low-confidence metrics: ${report.debugLane.lowConfidenceMetrics}`,
    `- Gaps: ${report.debugLane.gaps}`,
    "",
    "## Metric Hydration",
    "",
    ...metricRows,
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Active Old Logic",
    "",
    ...(report.activeOldLogic.length ? report.activeOldLogic.map((path) => `- ${path}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const dirty = changedFiles();
  const legacyUnknown = buildLegacyEventRecoveryCandidate({
    legacyEventId: "validator_legacy_unknown",
    rawEventName: "unknown_legacy",
    occurredAt: "2026-04-02T00:00:00.000Z",
    source: "validator",
    sessionId: "legacy_validator",
  });
  const report = buildPersonMetricsHydrationReport({
    envelopes: validationEnvelopes(),
    legacyCandidates: [legacyUnknown],
    generatedAtUtc,
  });
  const failures: string[] = [];
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const adminSummary = read("src/lib/server/admin-debug/summary.ts");
  const adminRoute = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");
  const activeOldLogic = findActiveOldLogic();
  const dirtyFileClassifications = dirty.map((path) => ({ path, classification: classifyPersonMetricsHydrationDirtyFile(path) }));

  for (const metric of PERSON_METRIC_DEFINITIONS) {
    if (metric.eventNames.length === 0) failures.push(`${metric.id} exists without hydration source.`);
    if (report.metricStatus[metric.id].count <= 0) failures.push(`${metric.id} event exists but metric does not hydrate.`);
  }
  if (report.lowConfidenceMetrics.length === PERSON_METRIC_IDS.length && report.missingHydration.some((metric) => !metric.explanation)) {
    failures.push("individual user metrics are all missing/low confidence with no source explanation.");
  }
  if (report.legacySummary.exactPromotionsBlocked < 1 || report.validation.unknownLegacyBecameExact) {
    failures.push("unknown legacy became exact user truth.");
  }
  const approvalMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "payment_approvals");
  if (report.validation.checkoutStartCountsAsPaymentSuccess || approvalMetric?.eventNames.includes("begin_checkout")) {
    failures.push("checkout start counts as payment success.");
  }
  if (report.validation.pageTimeCountsAsWatchTime) {
    failures.push("page time counts as watch time.");
  }
  if (Object.values(report.metricStatus).some((metric) => metric.count === 0 && metric.state === "hydrated" && metric.provenZero !== true)) {
    failures.push("zero shown without provenZero.");
  }
  if (!debugSummary.includes("person_metrics_hydration") || !adminSummary.includes("personMetricsHydration") || !adminRoute.includes("personMetricsHydration")) {
    failures.push("debug panel lacks Person metrics hydration lane.");
  }
  if (/user_metrics_confidence|person_metrics_confidence_panel|individual_user_metrics_debug/iu.test(debugSummary)) {
    failures.push("debug panel has duplicate user metric lanes.");
  }
  if (!SCORE_DIMENSION_KEYS.every((dimension) => report.scoreImpactByDimension[dimension])) {
    failures.push("score report lacks per-dimension effect.");
  }
  if (!packageJson.includes('"check:person-metrics-hydration": "tsx scripts/agent/validate-person-metrics-hydration.ts"')) {
    failures.push("package script check:person-metrics-hydration is missing.");
  }
  if (activeOldLogic.length > 0) {
    failures.push(`duplicate person metric helpers remain active: ${activeOldLogic.join(", ")}`);
  }
  if (dirtyFileClassifications.some((file) => file.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified.");
  }

  const output = {
    ...report,
    status: failures.length > 0 ? "fail" as const : report.status,
    currentHead,
    dirtyFiles: dirtyFileClassifications,
    activeOldLogic,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`Person metrics hydration validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Person metrics hydration validation passed: mapped=${output.debugLane.personMetricsMapped}, hydrated=${output.debugLane.eventEnvelopesHydrated}, lowConfidence=${output.debugLane.lowConfidenceMetrics}, gaps=${output.debugLane.gaps}.`);
}

main();
