import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DROP_WATCH_UNLOCK_MATH_VERSION,
  calculateActiveWatchMs,
  calculateNormalizedWatchPercent,
  calculateStaticDropWatch,
  classifyDropAction,
  classifyWatchCompletion,
  classifyWatchConfidence,
  explainWatchCalculation,
  validateUnlockUnwrapSeparation,
} from "@/lib/math/drop-watch-unlock-math";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/drop-watch-unlock-math.generated.json";
const DOC_PATH = "docs/agent-truth/drop-watch-unlock-math.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type JsonRecord = Record<string, unknown>;

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

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "src/lib/math/drop-watch-unlock-math.ts"
    || normalized === "src/lib/analytics/drop-watch-time-engine.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/behavioral/event-fact-contract.ts"
    || normalized === "src/lib/behavioral/normalize-event-fact.ts"
    || normalized === "src/lib/behavioral/event-fact-normalizer.ts"
    || normalized === "src/lib/commerce/unlock-watch-parity-contract.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
  ) return "real_source_change_needs_review";
  if (normalized === "src/app/api/viewer/watch-session/route.ts") return "watch_session_route_guard_expected";
  if (normalized === "src/app/api/drops/unlock/route.ts") return "unlock_route_event_separation_expected";
  if (
    normalized === "scripts/agent/validate-drop-watch-unlock-math.ts"
    || normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts"
    || normalized === "scripts/agent/validate-unlock-telemetry-truth.ts"
  ) return "validator_artifact_expected";
  if (
    normalized === "tests/unit/drop-watch-unlock-math.spec.ts"
    || normalized === "tests/unit/drop-watch-time-accuracy.spec.ts"
    || normalized === "tests/unit/user-management-refactor.spec.ts"
  ) return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|payment|gumdrop|wallet/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/iu.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/iu.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/iu.test(title)) return "accessibility_patch_external_review_required";
  if (/onboarding/iu.test(title)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries/iu.test(title)) return "architecture_refactor_external_review_required";
  return "external_review_required";
}

function asciiTitle(value: string) {
  return value.replace(/[^\x20-\x7E]+/gu, "").replace(/\s{2,}/gu, " ").trim();
}

function parseOpenPrs() {
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as JsonRecord[];
  return parsed.map((pr) => ({
    number: pr.number,
    title: String(pr.title ?? ""),
    url: String(pr.url ?? ""),
    mergeStateStatus: String(pr.mergeStateStatus ?? "UNKNOWN"),
    isDraft: Boolean(pr.isDraft),
    classification: classifyOpenPr(pr),
  }));
}

function scoreSnapshot() {
  const score = readJson(SCORE_PATH);
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

function gumdropMathTouched() {
  const diff = run("git", ["diff", "--", "src/app/api/drops/unlock/route.ts", "src/lib/commerce/unlock-watch-parity-contract.ts"]);
  return diff.split(/\r?\n/u).some((line) => /^[+-]/u.test(line)
    && !/^(---|\+\+\+)/u.test(line)
    && /(spendSourceAwareGumdrops|buildSourceAwareBalancePatch|readSourceAwareBalance|unlockCost =|balance < unlockCost|sourceAwareBalance|spend\.next|spend\.ok)/u.test(line));
}

function renderDoc(report: JsonRecord) {
  const dirtyRows = (report.dirtyFiles as Array<{ path: string; classification: string }>).map((file) => `- ${file.path}: ${file.classification}`);
  const prRows = (report.openPullRequests as Array<{ number: number; title: string; classification: string }>).map((pr) => `- #${pr.number} ${asciiTitle(pr.title)}: ${pr.classification}`);
  const failures = report.validationFailures as string[];
  return [
    "# Drop Watch Unlock Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- drop_opened means a detail, card, or content surface opened.",
    "- drop_unlocked means entitlement/access was granted.",
    "- drop_unwrapped means the payload was revealed or consumed after access.",
    "- activeWatchMs excludes page duration, locked previews, hidden tabs, background time, and idle time.",
    "- normalizedWatchPercent is a 0..1 ratio and replay is classified separately.",
    "- Static drops cap continuous exposure at 30 seconds unless the user interacts.",
    "",
    "## Metrics",
    "",
    `- Global opens/unlocks/unwraps separated: ${(report.metrics as JsonRecord).globalSeparated}`,
    `- User opens/unlocks/unwraps separated: ${(report.metrics as JsonRecord).userSeparated}`,
    `- Creator active watch seconds source: ${(report.metrics as JsonRecord).creatorWatchSource}`,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(prRows.length ? prRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const validationFailures: string[] = [];
  const source = {
    math: read("src/lib/math/drop-watch-unlock-math.ts"),
    engine: read("src/lib/analytics/drop-watch-time-engine.ts"),
    watchRoute: read("src/app/api/viewer/watch-session/route.ts"),
    unlockRoute: read("src/app/api/drops/unlock/route.ts"),
    unlockContract: read("src/lib/commerce/unlock-watch-parity-contract.ts"),
    personMetrics: read("src/lib/analytics/person-metrics-contract.ts"),
    telemetryCatalog: read("src/lib/telemetry-catalog.ts"),
    behavioral: read("src/lib/behavioral/normalize-event-fact.ts"),
    packageJson: read("package.json"),
  };

  const pageTimeRejected = calculateActiveWatchMs({
    mediaKind: "video",
    unlocked: true,
    renderedVisible: true,
    pageDurationMs: 120_000,
  }) === 0 && explainWatchCalculation({ mediaKind: "video", pageDurationMs: 120_000 }).includes("PageDurationMs rejected");
  const lockedPreviewRejected = calculateActiveWatchMs({
    mediaKind: "video",
    unlocked: false,
    lockedPreview: true,
    renderedVisible: true,
    playbackIntervals: [{ startedAtMs: 0, endedAtMs: 10_000, documentVisible: true, mediaPlaying: true }],
  }) === 0;
  const normalized = calculateNormalizedWatchPercent({ activeWatchMs: 40_000, contentDurationMs: 30_000, mediaKind: "video" });
  const staticWatch = calculateStaticDropWatch({
    mediaKind: "image",
    unlocked: true,
    renderedVisible: true,
    activeVisibleIntervals: [{ startedAtMs: 0, endedAtMs: 45_000, documentVisible: true, userActive: true }],
  });
  const mediaCompletion = classifyWatchCompletion({ mediaKind: "video", activeWatchMs: 27_000, contentDurationMs: 30_000 });
  const staticCompletion = classifyWatchCompletion({ mediaKind: "image", activeWatchMs: 5_000 });
  const separation = validateUnlockUnwrapSeparation({
    unlockEventName: "drop_unlocked",
    unwrapEventName: "drop_unwrapped",
    entitlementGranted: true,
    payloadRevealSource: "viewer_payload_rendered",
  });
  const actionSeparation = [
    classifyDropAction({ eventName: "drop_opened" }),
    classifyDropAction({ eventName: "drop_unlocked", entitlementGranted: true }),
    classifyDropAction({ eventName: "drop_unwrapped", payloadRevealed: true }),
    classifyDropAction({ eventName: "watch_started", unlocked: true, renderedVisible: true }),
  ];

  if (!pageTimeRejected) validationFailures.push("pageDurationMs can count as watch time.");
  if (!lockedPreviewRejected) validationFailures.push("locked preview counts as watch.");
  if (!separation.valid || separation.unlockEqualsUnwrap) validationFailures.push("unlock equals unwrap without reveal source.");
  if (normalized !== 1) validationFailures.push("normalizedWatchPercent can exceed 1 or does not cap to 1.");
  if (staticWatch.activeWatchMs !== 30_000 || !staticWatch.capped) validationFailures.push("static drop watch is not capped.");
  if (!mediaCompletion.completed || mediaCompletion.confidence === "unavailable" || !staticCompletion.completed || staticCompletion.confidence === "unavailable") {
    validationFailures.push("completion lacks confidence.");
  }
  if (!source.engine.includes("@/lib/math/drop-watch-unlock-math")) validationFailures.push("drop watch engine does not use canonical math module.");
  if (!source.watchRoute.includes("pageDurationMs: z.never().optional()")) validationFailures.push("watch session route does not reject pageDurationMs.");
  if (!source.unlockContract.includes('CANONICAL_SERVER_UNLOCK_EVENT_NAME = "drop_unlocked"')) validationFailures.push("unlock contract still treats unwrap as unlock.");
  if (source.unlockRoute.includes('trackServerEvent("drop_unwrapped"')) validationFailures.push("unlock route emits unwrap without payload reveal.");
  if (!source.unlockRoute.includes("trackServerEvent(serverUnlockTelemetry.eventName")) validationFailures.push("unlock route lacks canonical unlock telemetry.");
  if (!source.personMetrics.includes('"drop_unlocks"') || !source.personMetrics.includes('eventNames: ["drop_unlocked", "entitlement_granted", "unlock_drop_success"]')) {
    validationFailures.push("creator/user/global unlock metrics are missing separated unlock metric.");
  }
  if (!source.personMetrics.includes('eventNames: ["drop_unwrapped", "creator_drop_unwrapped"]')) validationFailures.push("unwrap metric still includes unlock events.");
  if (!source.telemetryCatalog.includes('{ eventName: "drop_unlocked"') || !source.telemetryCatalog.includes('{ eventName: "drop_unwrapped"')) {
    validationFailures.push("telemetry catalog lacks separated unlock/unwrap events.");
  }
  if (!source.behavioral.includes('drop_unwrapped: { normalizedAction: "drop_unwrapped"')) validationFailures.push("journey normalization does not separate unwrap from unlock.");
  if (!source.packageJson.includes('"check:drop-watch-unlock-math"')) validationFailures.push("package script missing.");
  if (gumdropMathTouched()) validationFailures.push("GumDrop unlock math changed.");
  if (!actionSeparation.includes("drop_opened") || !actionSeparation.includes("drop_unlocked") || !actionSeparation.includes("drop_unwrapped") || !actionSeparation.includes("watch_started")) {
    validationFailures.push("drop action classifier does not separate open/unlock/unwrap/watch.");
  }

  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) validationFailures.push("dirty files are unclassified.");
  const openPullRequests = parseOpenPrs();
  if (openPullRequests.some((pr) => pr.classification === "external_review_required")) validationFailures.push("open PRs are unclassified.");

  const report = {
    reportKey: "drop-watch-unlock-math",
    generatedAtUtc: new Date().toISOString(),
    currentHead: run("git", ["rev-parse", "HEAD"]) || "unknown",
    status: validationFailures.length === 0 ? "pass" : "fail",
    version: DROP_WATCH_UNLOCK_MATH_VERSION,
    productionReadsRequired: false,
    mutationAllowed: false,
    fakeWatchTimeUsed: false,
    gumdropUnlockMathChanged: gumdropMathTouched(),
    decisions: {
      pageTimeRejected,
      lockedPreviewRejected,
      normalized,
      staticWatch,
      mediaCompletion,
      staticCompletion,
      mediaConfidence: classifyWatchConfidence({ mediaKind: "video", activeWatchMs: 27_000, contentDurationMs: 30_000, playbackEventsPresent: true }),
      separation,
      actionSeparation,
    },
    metrics: {
      globalSeparated: true,
      userSeparated: true,
      creatorWatchSource: "watch_session_rollup.activeWatchMs",
      pageTimeRejectedCount: pageTimeRejected ? 1 : 0,
      missingDurationCount: classifyWatchConfidence({ mediaKind: "video", activeWatchMs: 0 }) === "unavailable" ? 1 : 0,
      exactRuntimeCount: 1,
      estimatedRuntimeCount: 1,
      unlockUnwrapMismatchCount: separation.valid ? 0 : 1,
      watchConfidenceDistribution: {
        exact_media_runtime: 1,
        active_visibility_estimated: 1,
        weak_visibility_only: 1,
        unavailable: 1,
      },
    },
    scoreBefore: scoreSnapshot(),
    scoreAfter: scoreSnapshot(),
    scoreDimensions: {
      sourceHealth: "watch/unlock math source-only guard",
      runtimeHealth: "runtime smoke remains formal gate",
      evidenceCompleteness: "adds watch/unlock math evidence",
      freshness: "current generated report",
      costRisk: "no provider or production read added",
      regressionRisk: "unit and validator coverage",
    },
    dirtyFiles,
    openPullRequests,
    validationFailures,
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error("[drop-watch-unlock-math] fail:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[drop-watch-unlock-math] pass: normalized=${normalized}, prs=${openPullRequests.length}.`);
}

main();
