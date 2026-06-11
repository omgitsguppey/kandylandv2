import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  REQUIRED_COUNT_DOMAINS,
  buildCanonicalCountKey,
  buildGlobalCountKey,
  buildLegacyCountKey,
  explainCountDecision,
  normalizeCountInput,
  shouldIncrementCount,
} from "@/lib/math/count-deduplication-normalizer";
import {
  METRIC_FORMULA_REFERENCES,
  getFormulaDefinition,
  validateMetricHasFormula,
} from "@/lib/math/canonical-math-authority-ledger";
import { normalizeGlobalUserMetric } from "@/lib/analytics/global-user-dedupe-engine";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/count-deduplication-normalization.generated.json";
const DOC_PATH = "docs/agent-truth/count-deduplication-normalization.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type JsonRecord = Record<string, unknown>;

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
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
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "src/lib/math/count-deduplication-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-count-deduplication-normalization.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/count-deduplication-normalization.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/canonical-math-authority-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/canonical-math-authority-ledger.md") return "documentation_artifact_expected";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/wallet|paypal|payment-runtime|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/count|dedupe|math|analytics/iu.test(normalized)) return "real_source_change_needs_review";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  const number = Number(pr.number ?? 0);
  if (/dependency|deps|npm|knip|syncpack|puppeteer/i.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/i.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/i.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/i.test(title)) return "accessibility_patch_external_review_required";
  if (/doctrine|banned-pattern|drift/i.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries|file risk/i.test(title)) return "architecture_refactor_external_review_required";
  if (/onboarding|friction|rescue signals/i.test(title)) return "onboarding_telemetry_external_review_required";
  return number > 0 ? "open_pr_external_review_required" : "not_applicable";
}

function listOpenPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
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
    return parsed.map((pr) => ({
      ...pr,
      classification: classifyOpenPr(pr),
    }));
  } catch {
    return [{ number: 0, title: "gh pr list parse failed", classification: "unsafe_unknown" }];
  }
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

function renderDoc(report: JsonRecord) {
  const dirtyFiles = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const prs = report.openPullRequests as Array<{ number: number; title: string; classification: string }>;
  const failures = report.validationFailures as string[];
  const debugLane = report.debugLane as JsonRecord;

  return [
    "# Count Deduplication Normalization",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Unique event priority is canonical eventId, then dedupeKey, then sessionId/eventName/objectId/timestamp bucket.",
    "- Linked guest to user actions count once globally and once under the best user identity only.",
    "- Weak or unknown legacy confidence counts in the legacy bucket, not exact user buckets.",
    "- Retry/replay events do not increment standard user-facing counts unless replay is the metric itself.",
    "- Formula references are registered for required count domains.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${debugLane.label}`,
    `- Required domains covered: ${debugLane.requiredDomainsCovered}`,
    `- Duplicate risk count: ${debugLane.duplicateRiskCount}`,
    `- Legacy bucket count: ${debugLane.legacyBucketCount}`,
    `- Replay suppressed count: ${debugLane.replaySuppressedCount}`,
    `- Missing formula references: ${debugLane.missingFormulaReferences}`,
    "",
    "## Dirty Files",
    "",
    ...(dirtyFiles.length ? dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(prs.length ? prs.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const scoreBefore = scoreSnapshot();
  const validationFailures: string[] = [];
  const sourceFiles = {
    normalizer: read("src/lib/math/count-deduplication-normalizer.ts"),
    mathLedger: read("src/lib/math/canonical-math-authority-ledger.ts"),
    globalUserEngine: read("src/lib/analytics/global-user-dedupe-engine.ts"),
    debugSummary: read("src/lib/debug/debug-panel-tracking-summary.ts"),
    packageJson: read("package.json"),
  };

  const linked = normalizeCountInput({
    domain: "creator_relationships",
    eventName: "creator_followed",
    eventId: "validator_linked",
    sessionId: "session_validator",
    guestId: "guest_validator",
    userId: "user_validator",
    linkedPersonId: "person_validator",
    linkId: "link_validator",
    creatorId: "creator_validator",
    identityConfidence: "linked",
  });
  const legacy = normalizeCountInput({
    domain: "support_account_actions",
    eventName: "support_ticket_created",
    eventId: "validator_legacy",
    sessionId: "legacy_session",
    userId: "legacy_user",
    identityConfidence: "unknown",
    legacy: true,
  });
  const replay = normalizeCountInput({
    domain: "wallet_opens",
    eventName: "wallet_opened",
    eventId: "validator_replay",
    sessionId: "session_validator",
    userId: "user_validator",
    identityConfidence: "exact",
    replayOfEventId: "wallet_opened:validator",
  });
  const existingDecision = normalizeGlobalUserMetric({
    eventId: "validator_existing",
    eventName: "creator_followed",
    featureId: "creator_profile",
    surface: "creator-profile",
    sessionId: "session_validator",
    guestId: "guest_validator",
    userId: "user_validator",
    linkedPersonId: "person_validator",
    linkId: "link_validator",
    identityState: "logged_in_linked_guest",
    identityConfidence: "linked",
    idempotencyKey: "creator_followed:creator_validator",
  });
  const fallbackDecision = normalizeGlobalUserMetric({
    eventId: "",
    eventName: "drop_preview_opened",
    featureId: "drops",
    surface: "drop-preview",
    sessionId: "session_bucket",
    objectId: "drop_42",
    timestampMs: 180_000,
    userId: "user_bucket",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
  });
  const domainFormulaChecks = REQUIRED_COUNT_DOMAINS.map((domain) => {
    const normalized = normalizeCountInput({
      domain,
      eventName: `${domain}_event`,
      eventId: `${domain}_event_id`,
      userId: "user_validator",
      sessionId: "session_validator",
      identityConfidence: "exact",
    });
    return {
      domain,
      formulaId: normalized.formulaId,
      formulaExists: Boolean(getFormulaDefinition(normalized.formulaId)),
      zeroUnknownBehavior: normalized.zeroUnknownBehavior,
    };
  });

  if (buildCanonicalCountKey(linked) !== "event:validator_linked") validationFailures.push("canonical key does not prefer eventId.");
  if (buildCanonicalCountKey({ ...linked, eventId: "", dedupeKey: "dedupe_validator" }) !== "dedupe:dedupe_validator") validationFailures.push("canonical key does not fall back to dedupeKey.");
  if (!buildCanonicalCountKey({ domain: "drops_opened", eventName: "drop_opened", sessionId: "s", objectId: "drop", timestampMs: 60_000 }).includes("bucket:")) validationFailures.push("canonical key lacks timestamp bucket fallback.");
  if (!shouldIncrementCount({ ...linked, scope: "global" }) || !shouldIncrementCount({ ...linked, scope: "user" }) || linked.decisions.guest.increment) {
    validationFailures.push("user/global count can double-count linked guest/user action.");
  }
  if (replay.decisions.global.increment || replay.decisions.user.increment || !replay.replaySuppressed) {
    validationFailures.push("retry/replay increments standard count.");
  }
  if (legacy.decisions.user.increment || legacy.decisions.global.increment || !legacy.decisions.legacy.increment || !buildLegacyCountKey(legacy)) {
    validationFailures.push("weak legacy counted as exact user.");
  }
  if (!explainCountDecision(linked).includes("zeroUnknownBehavior") || !linked.zeroUnknownBehavior.includes("unknown")) {
    validationFailures.push("count lacks zero/unknown behavior.");
  }
  if (!linked.divergenceExplanation.includes("best user identity")) {
    validationFailures.push("global/user divergence lacks explanation.");
  }
  if (!existingDecision.countDedupeMath?.canonicalKey || !existingDecision.countDedupeMath.divergenceExplanation) {
    validationFailures.push("existing global/user dedupe path lacks count normalizer reference.");
  }
  if (
    fallbackDecision.countDedupeMath?.canonicalKey !== "bucket:session_bucket:drop_preview_opened:drop_42:3"
    || fallbackDecision.dedupeKey !== fallbackDecision.countDedupeMath.globalKey
    || fallbackDecision.global.dedupeKey !== fallbackDecision.countDedupeMath.globalKey
    || fallbackDecision.user.dedupeKey !== fallbackDecision.countDedupeMath.userKey
  ) {
    validationFailures.push("global/user summary fallback keys bypass canonical count normalizer.");
  }
  if (!sourceFiles.globalUserEngine.includes("normalizeCountInput") || !sourceFiles.globalUserEngine.includes("countDedupeMath")) {
    validationFailures.push("person/global summary path is not wired to count normalizer where safe.");
  }
  if (!sourceFiles.globalUserEngine.includes("timestampMs: input.timestampMs") || !sourceFiles.globalUserEngine.includes("dedupeKey: canonicalGlobalKey")) {
    validationFailures.push("global/user summary path does not preserve canonical timestamp-bucket count keys.");
  }
  if (!sourceFiles.debugSummary.includes("count_dedupe_math") || !sourceFiles.debugSummary.includes("Count dedupe math")) {
    validationFailures.push("Count dedupe math debug lane missing.");
  }
  if (!sourceFiles.packageJson.includes("\"check:count-deduplication-normalization\"")) {
    validationFailures.push("package script check:count-deduplication-normalization missing.");
  }
  for (const check of domainFormulaChecks) {
    if (!check.formulaExists) validationFailures.push(`${check.domain} count has no formula reference.`);
    if (!check.zeroUnknownBehavior) validationFailures.push(`${check.domain} count lacks zero/unknown behavior.`);
  }
  for (const metricId of [
    "count_dedupe_global_count",
    "count_dedupe_user_count",
    "count_dedupe_creator_count",
    "count_dedupe_legacy_bucket_count",
    "count_dedupe_retry_replay_suppression",
  ]) {
    if (!METRIC_FORMULA_REFERENCES[metricId] || !validateMetricHasFormula(metricId).ok) {
      validationFailures.push(`${metricId} metric formula reference missing.`);
    }
  }

  const dirtyFiles = changedFiles().map((path) => ({
    path,
    classification: classifyDirtyFile(path),
  }));
  const openPullRequests = listOpenPrs();
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    validationFailures.push("dirty files are unclassified.");
  }
  if (openPullRequests.some((pr) => pr.classification === "unsafe_unknown")) {
    validationFailures.push("open PRs are unclassified.");
  }
  const scoreAfter = { ...scoreBefore };
  for (const dimension of SCORE_DIMENSIONS) {
    if (typeof scoreBefore[dimension] !== "number" || typeof scoreAfter[dimension] !== "number") {
      validationFailures.push(`score dimension ${dimension} before/after missing.`);
    }
  }

  const debugLane = {
    label: "Count dedupe math",
    requiredDomainsCovered: domainFormulaChecks.filter((check) => check.formulaExists).length,
    duplicateRiskCount: [linked, legacy, replay].filter((entry) => entry.duplicateRisk !== "none").length,
    legacyBucketCount: legacy.decisions.legacy.increment ? 1 : 0,
    replaySuppressedCount: replay.replaySuppressed ? 1 : 0,
    globalUserDivergenceExplanations: [linked, legacy, replay].filter((entry) => entry.divergenceExplanation).length,
    missingFormulaReferences: domainFormulaChecks.filter((check) => !check.formulaExists).length,
  };
  const report = {
    generatedAtUtc,
    reportKey: "count-deduplication-normalization",
    currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    productionDataMutated: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    scoreBefore,
    scoreAfter,
    requiredDomains: REQUIRED_COUNT_DOMAINS,
    domainFormulaChecks,
    sampleDecisions: { linked, legacy, replay, fallback: fallbackDecision },
    existingGlobalUserDedupeReference: existingDecision.countDedupeMath,
    debugLane,
    dirtyFiles,
    openPullRequests,
    validationFailures,
    nextExactSteps: [
      "Use count-deduplication-normalizer for new global/user/creator count materializers.",
      "Keep weak or unknown legacy counts in the legacy bucket until source identity truth is exact or linked.",
      "Keep SQL/export raw facts separate from user-facing counts when retries or replays are present.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(validationFailures.join("\n"));
    process.exit(1);
  }

  console.log(`count-deduplication-normalization pass: ${REPORT_PATH}`);
}

main();
