import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  LEGACY_EVENT_ALIAS_TABLE,
  LEGACY_RECOVERY_START_DATE,
  buildLegacyDedupeKey,
  canonicalizeLegacyEventName,
  classifyLegacyMetricConfidence,
  explainLegacyCanonicalization,
  mapLegacyEventToCurrentMetric,
} from "@/lib/math/legacy-metric-canonicalization";
import {
  buildLegacyRecoveryDryRun,
  dryRunOnly,
  recoveryStartDate,
} from "@/lib/math/legacy-recovery-dry-run-engine";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/metric-canonicalization-legacy-recovery.generated.json";
const DOC_PATH = "docs/agent-truth/metric-canonicalization-legacy-recovery.md";
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
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "src/lib/math/legacy-metric-canonicalization.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/legacy-recovery-dry-run-engine.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-metric-canonicalization-legacy-recovery.ts") return "failed_validator_to_repair";
  if (normalized === "tests/unit/metric-canonicalization-legacy-recovery.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment-runtime|wallet-runtime|gumdrop-ledger|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/legacy|metric|canonical|math|analytics/iu.test(normalized)) return "real_source_change_needs_review";
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
  const failures = report.validationFailures as string[];
  const dirtyFiles = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const prs = report.openPullRequests as Array<{ number: number; title: string; classification: string }>;
  const dryRun = report.dryRun as JsonRecord;
  const summary = dryRun.summary as JsonRecord;
  return [
    "# Metric Canonicalization Legacy Recovery",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Recovery starts at `2026-03-01`.",
    "- This is dry-run only: no production reads, writes, mutations, or live backfill.",
    "- Unknown legacy cannot become exact user truth.",
    "- Exact legacy identity requires deterministic userId, eventId, timestamp, and source route.",
    "- Exact source with incomplete identity is capped at inferred, partial route/event match is capped at weak, and unknown source/identity is archive-only.",
    "- Payment/ledger dedupe uses idempotency or provider/order fingerprints only and does not change payment or GumDrop math.",
    "",
    "## Alias Categories",
    "",
    ...Array.from(new Set(LEGACY_EVENT_ALIAS_TABLE.map((entry) => entry.aliasCategory))).map((category) => `- ${category}`),
    "",
    "## Dry-Run Summary",
    "",
    `- Input records: ${summary.inputRecords}`,
    `- Candidate count: ${summary.candidateCount}`,
    `- Canonical metric count: ${summary.canonicalMetricCount}`,
    `- Archive-only count: ${summary.archiveOnlyCount}`,
    `- Manual review count: ${summary.manualReviewCount}`,
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
  const validationFailures: string[] = [];
  const sourceFiles = {
    canonicalization: read("src/lib/math/legacy-metric-canonicalization.ts"),
    dryRunEngine: read("src/lib/math/legacy-recovery-dry-run-engine.ts"),
    packageJson: read("package.json"),
  };
  const scoreBefore = scoreSnapshot();

  const dryRun = buildLegacyRecoveryDryRun({
    records: [
      {
        legacySource: "analytics_event_facts",
        eventName: "old_drop_view",
        eventId: "event_drop",
        userId: "user_1",
        objectId: "drop_1",
        sourceRoute: "/drops/drop_1",
        occurredAt: "2026-03-02T00:00:00.000Z",
        sourceExact: true,
      },
      {
        legacySource: "transactions",
        eventName: "wallet_purchase_completed",
        userId: "user_1",
        idempotencyKey: "idem_1",
        providerOrderId: "order_1",
        sourceRoute: "/api/paypal/capture",
        occurredAt: "2026-03-03T00:00:00.000Z",
        sourceExact: true,
      },
      {
        legacySource: "old_events",
        eventName: "unknown_legacy",
        occurredAt: "2026-03-04T00:00:00.000Z",
      },
      {
        legacySource: "analytics_event_facts",
        eventName: "page_viewed",
        sessionId: "session_before",
        sourceRoute: "/",
        occurredAt: "2026-02-28T23:59:59.000Z",
      },
    ],
  });

  const aliasCategories = new Set(LEGACY_EVENT_ALIAS_TABLE.map((entry) => entry.aliasCategory));
  const requiredAliasCategories = [
    "watch_page_duration",
    "unlock_drop_open",
    "wallet_payment",
    "signup_login",
    "daily_task_checkin",
    "chat_message",
    "notification",
    "creator_profile_follow",
    "search_discovery",
    "support_settings",
  ];
  if (LEGACY_RECOVERY_START_DATE !== "2026-03-01" || recoveryStartDate !== "2026-03-01") validationFailures.push("March 1 recovery boundary missing.");
  if (!dryRunOnly || dryRun.mode !== "dry_run_only" || dryRun.readsProduction || dryRun.mutationsAllowed || dryRun.liveBackfill) {
    validationFailures.push("dryRunOnly/no production mutation contract missing.");
  }
  if (/\bexport\s+function\s+(?:backfill|mutate|write|commit|apply)/iu.test(`${sourceFiles.canonicalization}\n${sourceFiles.dryRunEngine}`)) {
    validationFailures.push("Recovery source exports a mutation-like function.");
  }
  for (const category of requiredAliasCategories) {
    if (!aliasCategories.has(category as never)) validationFailures.push(`${category} alias mapping missing.`);
  }
  const unknown = classifyLegacyMetricConfidence({ eventName: "unknown_legacy", occurredAt: "2026-03-02T00:00:00.000Z" });
  if (unknown.identityConfidence === "exact" || unknown.action !== "archive_only") validationFailures.push("Unknown legacy can become exact or non-archive.");
  const exact = classifyLegacyMetricConfidence({
    canonicalEventName: "drop_unlocked",
    userId: "user_1",
    eventId: "event_1",
    occurredAt: "2026-03-02T00:00:00.000Z",
    sourceRoute: "/api/drops/unlock",
    sourceExact: true,
  });
  if (exact.identityConfidence !== "exact" || exact.confidenceWeight !== 1) validationFailures.push("Exact legacy identity rule failed.");
  const inferred = classifyLegacyMetricConfidence({
    canonicalEventName: "drop_unlocked",
    eventId: "event_2",
    occurredAt: "2026-03-02T00:00:00.000Z",
    sourceRoute: "/api/drops/unlock",
    sourceExact: true,
  });
  if (inferred.identityConfidence !== "inferred" || inferred.confidenceWeight !== 0.6) validationFailures.push("Incomplete exact source did not cap at inferred.");
  const weak = classifyLegacyMetricConfidence({
    eventName: "old_drop_view",
    sourceRoute: "/drops/a",
    occurredAt: "2026-03-02T00:00:00.000Z",
    partialRouteMatch: true,
  });
  if (weak.identityConfidence !== "weak" || weak.confidenceWeight !== 0.35) validationFailures.push("Partial route/event match did not cap at weak.");
  for (const alias of LEGACY_EVENT_ALIAS_TABLE) {
    if (!alias.confidenceFloor || !alias.reason) validationFailures.push(`${alias.aliasCategory}:${alias.canonicalEventName} alias lacks confidence/reason.`);
  }
  if (mapLegacyEventToCurrentMetric({ eventName: "unlock_drop_success" }).canonicalEventName !== "drop_unlocked") {
    validationFailures.push("Legacy event maps to metric without canonical event name.");
  }
  const paymentKey = buildLegacyDedupeKey({
    canonicalEventName: "gumdrops_purchased",
    eventKind: "payment_ledger",
    idempotencyKey: "idem_1",
    providerOrderId: "provider_1",
    occurredAt: "2026-03-02T00:00:00.000Z",
  });
  if (paymentKey !== "payment_ledger:idem_1") validationFailures.push("Payment/ledger dedupe does not use idempotency/provider fingerprint.");
  if (!dryRun.candidates.every((candidate) => candidate.duplicateRisk && candidate.reason && candidate.accuracyImpact && candidate.userVisibleImpact)) {
    validationFailures.push("Dry-run candidate lacks duplicate risk, reason, accuracy impact, or user-visible impact.");
  }
  if (!explainLegacyCanonicalization({ eventName: "unknown_legacy", occurredAt: "2026-03-02T00:00:00.000Z" }).includes("unknown legacy cannot become exact")) {
    validationFailures.push("Canonicalization explanation missing unknown legacy exactness block.");
  }
  if (!sourceFiles.packageJson.includes('"check:metric-canonicalization-legacy-recovery": "tsx scripts/agent/validate-metric-canonicalization-legacy-recovery.ts"')) {
    validationFailures.push("Package script missing.");
  }

  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const openPullRequests = listOpenPrs();
  const unsafeDirty = dirtyFiles.filter((file) => file.classification === "unsafe_unknown");
  const unsafePrs = openPullRequests.filter((pr) => pr.classification === "unsafe_unknown");
  if (unsafeDirty.length) validationFailures.push(`Dirty files unclassified: ${unsafeDirty.map((file) => file.path).join(", ")}`);
  if (unsafePrs.length) {
    validationFailures.push(`Open PRs unclassified: ${unsafePrs.map((pr) => String((pr as JsonRecord).number ?? "unknown")).join(", ")}`);
  }

  const report = {
    reportKey: "metric-canonicalization-legacy-recovery",
    generatedAtUtc,
    currentHead,
    status: validationFailures.length ? "fail" : "pass",
    scoreBefore,
    scoreAfter: scoreSnapshot(),
    dryRunOnly: true,
    productionReadsRequired: false,
    mutationsAllowed: false,
    recoveryStartDate,
    aliasMappings: LEGACY_EVENT_ALIAS_TABLE,
    dryRun,
    checks: {
      marchFirstBoundary: recoveryStartDate === "2026-03-01",
      dryRunOnly: dryRunOnly === true && dryRun.mutationsAllowed === false,
      unknownLegacyCannotBecomeExact: unknown.identityConfidence !== "exact" && unknown.action === "archive_only",
      aliasMappingHasConfidence: LEGACY_EVENT_ALIAS_TABLE.every((entry) => entry.confidenceFloor && entry.reason),
      duplicateRiskPresent: dryRun.candidates.every((candidate) => candidate.duplicateRisk),
      canonicalEventNameRequired: dryRun.candidates.every((candidate) => candidate.canonicalEventName),
      recoveryCannotMutateProduction: dryRun.mutationPrevention.productionMutationBlocked === true,
      accuracyExplanationPresent: dryRun.candidates.every((candidate) => candidate.accuracyImpact && candidate.userVisibleImpact),
    },
    dirtyFiles,
    openPullRequests,
    validationFailures,
    releaseNoteImpact: [
      "Added dry-run canonicalization for legacy event and metric data from March 1.",
      "Mapped old event aliases into current metrics with confidence and duplicate risk.",
      "Kept unknown legacy data from becoming exact user truth.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length) {
    console.error(`[metric-canonicalization-legacy-recovery] failed: ${validationFailures.join("; ")}`);
    process.exit(1);
  }
  console.log(`[metric-canonicalization-legacy-recovery] pass: ${LEGACY_EVENT_ALIAS_TABLE.length} aliases, ${dryRun.candidates.length} dry-run candidates.`);
}

main();
