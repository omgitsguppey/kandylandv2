import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildEventTranslationBridgeReport,
  classifyEventTranslationDirtyFile,
  listEventTranslationBridgeCanonicalEvents,
  translateEnvelopeToFeatureActivity,
  translateEnvelopeToPersonMetric,
  translateRawEventToEnvelope,
} from "@/lib/analytics/event-translation-bridge";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/event-translation-bridge.generated.json";
const DOC_PATH = "docs/agent-truth/event-translation-bridge.md";

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

function findActiveOldLogic() {
  const oldLogicPattern = /source_ready_waiting_for_activity|stale_metric_bridge|orphaned activity|materializer missing as healthy|unknown activity accepted/iu;
  return trackedFiles().filter((path) => {
    if (!existsSync(join(ROOT, path))) return false;
    if (path === "scripts/agent/validate-event-translation-bridge.ts") return false;
    if (path === "docs/agent-truth/event-translation-bridge.md") return false;
    if (path === "tests/unit/event-translation-bridge.spec.ts") return false;
    if (path === "src/lib/analytics/event-translation-bridge.ts") return false;
    if (path === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return false;
    if (path === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return false;
    if (path === "scripts/agent/validate-future-activity-signal-reclassification.ts") return false;
    if (path === "scripts/agent/validate-final-signal-zero-lock.ts") return false;
    if (path === "tests/unit/future-activity-signal-reclassification.spec.ts") return false;
    return oldLogicPattern.test(read(path));
  });
}

function renderDoc(report: ReturnType<typeof buildEventTranslationBridgeReport>) {
  const scoreRows = Object.entries(report.scoreImpactByDimension).map(([dimension, impact]) =>
    `- ${dimension}: before=${impact.before}; after=${impact.after}; ${impact.reason}`,
  );
  const waitingRows = report.waitingOnActivity.slice(0, 20).map((item) =>
    `- ${item.reason}; scoreDrag=${item.scoreDrag}; missingProducer=${item.missingProducer ?? "none"}; next=${item.nextAction}`,
  );
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  return [
    "# Event Translation Bridge",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    "",
    "## Contract",
    "",
    "- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.",
    "- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.",
    "- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.",
    "",
    "## Debug Lane",
    "",
    `- Producers registered: ${report.debugLane.producersRegistered}`,
    `- Producers connected: ${report.debugLane.producersConnected}`,
    `- Event envelopes translated: ${report.debugLane.eventEnvelopesTranslated}`,
    `- Materializers mapped: ${report.debugLane.materializersMapped}`,
    `- Person metrics mapped: ${report.debugLane.personMetricsMapped}`,
    `- Gaps: ${report.debugLane.gaps}`,
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Waiting-On-Activity Classification",
    "",
    ...(waitingRows.length ? waitingRows : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
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
  const report = buildEventTranslationBridgeReport({
    dirtyFiles: dirty,
    generatedAtUtc,
    currentHead,
  });
  const failures = [...report.validationFailures];
  const bridgeSource = read("src/lib/analytics/event-translation-bridge.ts");
  const debugSource = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const summarySource = read("src/lib/server/admin-debug/summary.ts");
  const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");
  const canonicalEvents = listEventTranslationBridgeCanonicalEvents();
  const dirtyFileClassifications = dirty.map((path) => ({ path, classification: classifyEventTranslationDirtyFile(path) }));
  const activeOldLogic = findActiveOldLogic();

  for (const event of canonicalEvents) {
    const envelope = translateRawEventToEnvelope({
      eventName: event.eventName,
      eventId: `validator:${event.eventName}`,
      timestamp: generatedAtUtc,
      sessionId: "validator_session",
      source: "system",
      systemGenerated: true,
    });
    const featureActivity = translateEnvelopeToFeatureActivity({ envelope, observedActivityCount: 0 });
    const personMetric = translateEnvelopeToPersonMetric({ envelope });
    if (envelope.pipelineStatus !== "normal") failures.push(`${event.eventName} lacks translation into canonical envelope.`);
    if (!featureActivity.producerConnected) failures.push(`${event.eventName} lacks feature activity mapping.`);
    if (personMetric.classificationStatus === "missing_classification") failures.push(`${event.eventName} lacks person metric classification.`);
  }

  const registeredEvents = new Set(FEATURE_REGISTRATION_REGISTRY.flatMap((feature) => feature.telemetryEvents));
  for (const requiredEvent of ["wallet_opened", "drop_clicked", "drop_unwrapped", "creator_profile_viewed", "settings_surface_viewed"]) {
    if (!registeredEvents.has(requiredEvent)) failures.push(`${requiredEvent} required producer is not registered.`);
    const bridgeEntry = report.waitingOnActivity.find((entry, index) => canonicalEvents[index]?.eventName === requiredEvent);
    if (bridgeEntry?.scoreDrag) failures.push(`${requiredEvent} says waiting despite registered producer.`);
  }

  if (!bridgeSource.includes("translateRawEventToEnvelope") || !bridgeSource.includes("detectTranslationGap")) {
    failures.push("event bridge exported functions are missing.");
  }
  if (!debugSource.includes("event_translation_bridge") || !summarySource.includes("eventTranslationBridge") || !adminDebugRoute.includes("eventTranslationBridge")) {
    failures.push("event bridge lacks debug lane wiring.");
  }
  if (!SCORE_DIMENSION_KEYS.every((dimension) => report.scoreImpactByDimension[dimension])) {
    failures.push("score report lacks dimension-by-dimension impact.");
  }
  if (!packageJson.includes('"check:event-translation-bridge": "tsx scripts/agent/validate-event-translation-bridge.ts"')) {
    failures.push("package script check:event-translation-bridge is missing.");
  }
  if (activeOldLogic.length > 0) {
    failures.push(`old duplicate translation helpers remain active: ${activeOldLogic.join(", ")}`);
  }
  if (dirtyFileClassifications.some((file) => file.classification === "unsafe_unknown")) {
    failures.push("dirty files are unclassified.");
  }

  const output = {
    ...report,
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    dirtyFiles: dirtyFileClassifications,
    activeOldLogic,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`Event translation bridge validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Event translation bridge validation passed: producers=${output.debugLane.producersRegistered}, connected=${output.debugLane.producersConnected}, envelopes=${output.debugLane.eventEnvelopesTranslated}, gaps=${output.debugLane.gaps}.`);
}

const SCORE_DIMENSION_KEYS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;

main();
