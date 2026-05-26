import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DURATION_MATH_CATEGORIES,
  calculateActiveDurationMs,
  calculateFlowDurationMs,
  calculateWatchDurationMs,
  normalizeDurationInput,
} from "@/lib/math/duration-math-normalizer";
import {
  requireFormulaDefinition,
  validateMetricHasFormula,
} from "@/lib/math/canonical-math-authority-ledger";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/duration-math-normalization.generated.json";
const DOC_PATH = "docs/agent-truth/duration-math-normalization.md";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
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
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "src/lib/math/duration-math-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-duration-math-normalization.ts") return "failed_validator_to_repair";
  if (normalized === "scripts/agent/validate-canonical-math-authority-ledger.ts") return "failed_validator_to_repair";
  if (normalized === "tests/unit/duration-math-normalization.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "tests/unit/canonical-math-authority-ledger.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/canonical-math-authority-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/drop-watch-time-accuracy.generated.json") return "stale_generated_artifact_to_regenerate";
  if (normalized === "agent/state/session-bounce-calculation.generated.json") return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/canonical-math-authority-ledger.md") return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/drop-watch-time-accuracy.md") return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/session-bounce-calculation.md") return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts") return "failed_validator_to_repair";
  if (normalized === "scripts/agent/validate-session-bounce-calculation.ts") return "failed_validator_to_repair";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|wallet|payment|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  const number = Number(pr.number ?? 0);
  if (/dependency|npm|knip|syncpack|puppeteer/i.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/i.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/i.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/i.test(title)) return "accessibility_patch_external_review_required";
  if (/doctrine|banned-pattern|drift/i.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries|file risk/i.test(title)) return "architecture_refactor_external_review_required";
  if (/onboarding|friction|rescue signals/i.test(title)) return "onboarding_telemetry_external_review_required";
  return number > 0 ? "open_pr_external_review_required" : "not_applicable";
}

function listOpenPrs() {
  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus,isDraft",
  ]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JsonRecord[];
    return parsed.map((pr) => ({ ...pr, classification: classifyOpenPr(pr) }));
  } catch {
    return [{ number: 0, title: "gh pr list parse failed", classification: "unsafe_unknown" }];
  }
}

function scoreSnapshot() {
  const score = readJson("agent/state/public-beta-score.generated.json");
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

function renderDoc(report: JsonRecord) {
  const failures = report.validationFailures as string[];
  const dirtyFiles = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const openPullRequests = report.openPullRequests as Array<{ number: number; title: string; classification: string }>;

  return [
    "# Duration Math Normalization",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only pass normalizes duration semantics across sessions, drop watch time, task duration, checkout/auth/chat/media/notification flows, and legacy unknown duration. It does not mutate production data and does not change payment, wallet, PayPal, GumDrop, or navigation behavior.",
    "",
    "## Canonical Rules",
    "",
    "- Active time requires foreground visibility and recent user/action/media activity.",
    "- Hidden/background and idle time are excluded from active time.",
    "- Passive visible time remains separate from active time.",
    "- Watch time is media/content exposure only, not page-open duration.",
    "- Unknown and unsupported legacy duration remains unavailable, not zero.",
    "",
    "## Debug Lane",
    "",
    `- exact: ${(report.debugLane as JsonRecord).exactCount}`,
    `- estimated: ${(report.debugLane as JsonRecord).estimatedCount}`,
    `- unavailable: ${(report.debugLane as JsonRecord).unavailableCount}`,
    `- suspicious page-time fallback: ${(report.debugLane as JsonRecord).suspiciousPageTimeFallbackCount}`,
    `- background excluded: ${(report.debugLane as JsonRecord).backgroundExcludedCount}`,
    "",
    "## Dirty Files",
    "",
    ...(dirtyFiles.length ? dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(openPullRequests.length ? openPullRequests.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const validationFailures: string[] = [];
  const source = readFileSync(join(ROOT, "src/lib/math/duration-math-normalizer.ts"), "utf8");
  const debugSource = readFileSync(join(ROOT, "src/lib/debug/debug-panel-tracking-summary.ts"), "utf8");

  const session = normalizeDurationInput({
    category: "session_active",
    source: "session",
    startedAtMs: 1_000,
    endedAtMs: 11_000,
    foregroundVisibleMs: 10_000,
    activeMs: 5_000,
    passiveVisibleMs: 2_000,
    idleMs: 1_000,
    hiddenMs: 2_000,
    recentActivityAtMs: 10_500,
  });
  const pageWatch = normalizeDurationInput({
    category: "drop_watch_active",
    source: "page",
    startedAtMs: 1_000,
    endedAtMs: 31_000,
    pageOpenMs: 30_000,
    activeMs: 30_000,
    contentDurationMs: 30_000,
  });
  const watch = normalizeDurationInput({
    category: "drop_watch_normalized",
    source: "media",
    mediaActiveMs: 45_000,
    contentDurationMs: 30_000,
    replayCount: 2,
    countReplay: false,
  });
  const flow = normalizeDurationInput({
    category: "checkout_flow_duration",
    source: "flow",
    startedAtMs: 1_000,
    abandonedAtMs: 16_000,
    pageOpenMs: 60_000,
  });
  const legacy = normalizeDurationInput({
    category: "unknown_legacy_duration",
    source: "legacy",
    legacy: true,
  });

  if (calculateActiveDurationMs(session.input) !== 5_000) validationFailures.push("active duration did not preserve foreground active bucket.");
  if (session.hiddenMs !== 2_000 || session.idleMs !== 1_000 || session.passiveVisibleMs !== 2_000) validationFailures.push("session duration buckets are not separated.");
  if (pageWatch.watchMs !== null || calculateWatchDurationMs(pageWatch.input) !== null) validationFailures.push("page-open duration can still become watch time.");
  if (watch.watchMs !== 30_000 || watch.normalizedWatchPercent !== 100) validationFailures.push("watch duration is not capped when replay is not explicitly counted.");
  if (calculateFlowDurationMs(flow.input) !== 15_000 || flow.confidence !== "estimated") validationFailures.push("abandoned flow duration is not estimated from lifecycle timestamp.");
  if (legacy.durationMs !== null || legacy.confidence !== "legacy_unknown" || legacy.availability !== "unavailable") validationFailures.push("unknown legacy duration is not unavailable.");

  for (const category of DURATION_MATH_CATEGORIES) {
    const metricId = `duration_${category}`;
    const formulaId = `duration_math.${category}` as const;
    const metric = validateMetricHasFormula(metricId);
    if (!metric.ok) validationFailures.push(`${metricId} lacks formula reference.`);
    const formula = requireFormulaDefinition(formulaId);
    if (!formula.durationStates?.includes("unknown")) validationFailures.push(`${formulaId} lacks unknown duration state.`);
    if (!formula.confidenceRule.includes("legacy_unknown")) validationFailures.push(`${formulaId} lacks legacy_unknown confidence rule.`);
    if (category.includes("watch") && !formula.legacyRule.includes("page-open")) validationFailures.push(`${formulaId} does not reject page-open watch fallback.`);
  }

  if (!source.includes("page-open time is not watch time")) validationFailures.push("duration normalizer lacks page-open watch rejection explanation.");
  if (!source.includes("unknown duration is unavailable, not zero")) validationFailures.push("duration normalizer lacks unknown-not-zero rule.");
  if (!debugSource.includes('"duration_math"') || !debugSource.includes("Duration math")) validationFailures.push("Duration math debug lane is missing.");
  if (/paypal|gumdrop-ledger|source-of-funds|PayPal/iu.test(source)) validationFailures.push("duration math normalizer touched payment or GumDrop concepts.");

  const dirtyFiles = changedFiles().map((path) => ({
    path,
    classification: classifyDirtyFile(path),
  }));
  const openPullRequests = listOpenPrs();
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) validationFailures.push("dirty files or untracked files are unclassified.");
  if (openPullRequests.some((pr) => pr.classification === "unsafe_unknown")) validationFailures.push("open PRs are unclassified.");

  const scoreBefore = scoreSnapshot();
  const scoreAfter = { ...scoreBefore };
  const decisions = [session, pageWatch, watch, flow, legacy];
  const debugLane = {
    label: "Duration math",
    exactCount: decisions.filter((decision) => decision.confidence === "exact").length,
    estimatedCount: decisions.filter((decision) => decision.confidence === "estimated").length,
    unavailableCount: decisions.filter((decision) => decision.availability === "unavailable").length,
    suspiciousPageTimeFallbackCount: decisions.filter((decision) => decision.suspiciousPageTimeFallback).length,
    backgroundExcludedCount: decisions.filter((decision) => decision.backgroundExcluded).length,
    missingFormulaReferences: validationFailures.filter((failure) => failure.includes("formula")).length,
    sourceTruth: "src/lib/math/duration-math-normalizer.ts",
  };
  const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "duration-math-normalization",
    currentHead: run("git", ["rev-parse", "HEAD"]) || "unknown",
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    productionDataMutated: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    categories: DURATION_MATH_CATEGORIES,
    sampleDecisions: decisions,
    debugLane,
    scoreBefore,
    scoreAfter,
    dirtyFiles,
    openPullRequests,
    validationFailures,
    nextExactSteps: [
      "Use duration formula references before displaying any new user/admin duration metric.",
      "Keep page-open time out of watch time and active time calculations.",
      "Escalate any uncovered legacy duration formula as needs_operator_decision instead of promoting it to exact.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(validationFailures.join("\n"));
    process.exit(1);
  }

  console.log(`duration-math-normalization pass: ${REPORT_PATH}`);
}

main();
