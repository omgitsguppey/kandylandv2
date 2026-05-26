import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CANONICAL_MATH_FORMULA_REFERENCES,
  METRIC_FORMULA_REFERENCES,
  listFormulaDefinitions,
} from "@/lib/math/canonical-math-authority-ledger";
import type {
  FormulaDefinition,
  FormulaInventoryReference,
  MathAuthorityStatus,
} from "@/lib/math/canonical-math-authority-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/canonical-math-authority-ledger.generated.json";
const DOC_PATH = "docs/agent-truth/canonical-math-authority-ledger.md";

type JsonRecord = Record<string, unknown>;

const REQUIRED_SCORE_IDS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

const REQUIRED_DOMAINS = [
  "beta_score",
  "source_health",
  "runtime_health",
  "evidence_completeness",
  "freshness",
  "cost_risk",
  "regression_risk",
  "user_metrics",
  "global_metrics",
  "session_metrics",
  "watch_time",
  "bounce",
  "revenue",
  "gumdrop",
  "creator_monetization",
  "fan_pass",
  "discovery",
  "chat",
  "daily_tasks",
  "notifications",
  "media",
  "legacy_recovery",
] as const;

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
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "src/lib/math/canonical-math-authority-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/count-deduplication-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-canonical-math-authority-ledger.ts") return "failed_validator_to_repair";
  if (normalized === "scripts/agent/validate-count-deduplication-normalization.ts") return "failed_validator_to_repair";
  if (normalized === "tests/unit/canonical-math-authority-ledger.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "tests/unit/count-deduplication-normalization.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/count-deduplication-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/count-deduplication-normalization.md") return "release_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
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
    return parsed.map((pr) => ({
      ...pr,
      classification: classifyOpenPr(pr),
    }));
  } catch {
    return [{
      number: 0,
      title: "gh pr list parse failed",
      classification: "unsafe_unknown",
    }];
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

function validateFormula(formula: FormulaDefinition, failures: string[]) {
  const label = formula.formulaId;
  for (const [key, value] of Object.entries({
    numerator: formula.numerator,
    denominator: formula.denominator,
    timeWindow: formula.timeWindow,
    dedupeKey: formula.dedupeKey,
    sourceTruth: formula.sourceTruth,
    confidenceRule: formula.confidenceRule,
    zeroDenominatorRule: formula.zeroDenominatorRule,
    legacyRule: formula.legacyRule,
    owner: formula.owner,
  })) {
    if (!value || value === "missing") failures.push(`${label} missing ${key}.`);
  }
  const requiresRateFields = /\brate\b|\brates\b|percent|average|weightedAverage|\/\s*allowedMs/iu
    .test(`${formula.humanName} ${formula.formulaExpression}`);
  if (requiresRateFields) {
    if (formula.denominator === "n/a") failures.push(`${label} rate/score formula missing denominator.`);
    if (formula.zeroDenominatorRule === "n/a") failures.push(`${label} rate/score formula missing zero denominator rule.`);
  }
  if (formula.countRule === "integer" && formula.dedupeKey === "n/a") {
    failures.push(`${label} count formula missing dedupe key.`);
  }
  if ((formula.domain === "watch_time" || formula.domain === "session_metrics" || formula.domain === "bounce") && !formula.durationStates?.length) {
    failures.push(`${label} duration formula missing duration state separation.`);
  }
  if ((formula.domain === "revenue" || formula.domain === "gumdrop" || formula.domain === "creator_monetization" || formula.domain === "daily_tasks")
    && !formula.valueSourceBreakdown?.includes("confidence")) {
    failures.push(`${label} money/GumDrop formula missing value source/confidence breakdown.`);
  }
  if (/legacy/iu.test(`${formula.formulaId} ${formula.legacyRule}`) && !/cannot become exact|cannot be promoted|cannot become current|cannot override|not become|non-exact|remain unknown|remains unknown|stays unknown/iu.test(formula.legacyRule)) {
    failures.push(`${label} legacy rule does not block unsupported exact promotion.`);
  }
  if (formula.adminFacingAllowed && (!formula.sourceTruth || !formula.confidenceRule)) {
    failures.push(`${label} admin-facing formula missing source/confidence.`);
  }
}

function renderDoc(report: JsonRecord) {
  const formulas = report.formulas as FormulaDefinition[];
  const statuses = report.statusCounts as Record<MathAuthorityStatus, number>;
  const decisions = formulas.filter((formula) => formula.authorityStatus === "needs_operator_decision");
  const dirtyFiles = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const prs = report.openPullRequests as Array<{ number: number; title: string; classification: string }>;
  const failures = report.validationFailures as string[];

  return [
    "# Canonical Math Authority Ledger",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only ledger inventories the current formula authorities for scores, metrics, rates, counts, durations, confidence, revenue, GumDrops, creator monetization, and legacy recovery. It does not change payment, wallet, PayPal, GumDrop, or production data math.",
    "",
    "## Status Counts",
    "",
    `- canonical: ${statuses.canonical ?? 0}`,
    `- needs_operator_decision: ${statuses.needs_operator_decision ?? 0}`,
    `- duplicate: ${statuses.duplicate ?? 0}`,
    `- stale: ${statuses.stale ?? 0}`,
    `- in_flight: ${statuses.in_flight ?? 0}`,
    `- missing_definition: ${statuses.missing_definition ?? 0}`,
    "",
    "## Canonical Formula Inventory",
    "",
    "| Formula | Domain | Status | Owner | Source truth |",
    "| --- | --- | --- | --- | --- |",
    ...formulas.map((formula) => `| ${formula.formulaId} | ${formula.domain} | ${formula.authorityStatus} | ${formula.owner} | ${formula.sourceTruth.replace(/\|/gu, "/")} |`),
    "",
    "## Needs Operator Decision",
    "",
    ...(decisions.length
      ? decisions.map((formula) => `- ${formula.formulaId}: ${formula.legacyRule}`)
      : ["- none"]),
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
  const formulas = listFormulaDefinitions();
  const validationFailures: string[] = [];
  const formulaIds = new Set<string>();
  const domains = new Set(formulas.map((formula) => formula.domain));

  for (const formula of formulas) {
    if (formulaIds.has(formula.formulaId)) validationFailures.push(`duplicate formula id remains unclassified: ${formula.formulaId}`);
    formulaIds.add(formula.formulaId);
    validateFormula(formula, validationFailures);
  }
  for (const domain of REQUIRED_DOMAINS) {
    if (!domains.has(domain)) validationFailures.push(`required math domain missing: ${domain}`);
  }
  for (const scoreId of REQUIRED_SCORE_IDS) {
    const formulaId = METRIC_FORMULA_REFERENCES[scoreId];
    const formula = formulas.find((entry) => entry.formulaId === formulaId);
    if (!formula) {
      validationFailures.push(`score dimension lacks formula definition: ${scoreId}`);
      continue;
    }
    if (!formula.scoreImpact) {
      validationFailures.push(`score dimension formula lacks scoreImpact: ${scoreId}`);
      continue;
    }
    for (const key of ["weight", "formula", "cap", "penalty", "blockerType"] as const) {
      if (formula.scoreImpact[key] === undefined || formula.scoreImpact[key] === "") {
        validationFailures.push(`score dimension ${scoreId} missing scoreImpact.${key}`);
      }
    }
  }
  for (const reference of CANONICAL_MATH_FORMULA_REFERENCES as readonly FormulaInventoryReference[]) {
    if (reference.status === "duplicate" || reference.status === "stale") {
      validationFailures.push(`${reference.referenceId} remains ${reference.status} without retirement.`);
    }
    if (reference.status !== "needs_operator_decision" && !formulaIds.has(reference.formulaId)) {
      validationFailures.push(`${reference.referenceId} references missing formula ${reference.formulaId}.`);
    }
  }
  const debugSummarySource = readFileSync(join(ROOT, "src/lib/debug/debug-panel-tracking-summary.ts"), "utf8");
  if (!debugSummarySource.includes('"math_authority"') || !debugSummarySource.includes("Math authority")) {
    validationFailures.push("Math authority debug/admin lane is missing.");
  }

  const dirtyFiles = changedFiles().map((path) => ({
    path,
    classification: classifyDirtyFile(path),
  }));
  const openPullRequests = listOpenPrs();
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    validationFailures.push("dirty files or untracked files are unclassified.");
  }
  if (openPullRequests.some((pr) => pr.classification === "unsafe_unknown")) {
    validationFailures.push("open PRs are unclassified.");
  }

  const scoreBefore = scoreSnapshot();
  const scoreAfter = { ...scoreBefore };
  const statusCounts = formulas.reduce<Record<MathAuthorityStatus, number>>((output, formula) => {
    output[formula.authorityStatus] = (output[formula.authorityStatus] ?? 0) + 1;
    return output;
  }, {} as Record<MathAuthorityStatus, number>);
  const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "canonical-math-authority-ledger",
    currentHead: run("git", ["rev-parse", "HEAD"]) || "unknown",
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    productionDataMutated: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    formulas,
    formulaReferences: CANONICAL_MATH_FORMULA_REFERENCES,
    metricFormulaReferences: METRIC_FORMULA_REFERENCES,
    statusCounts,
    debugLane: {
      label: "Math authority",
      formulasInventoried: formulas.length,
      canonicalFormulas: statusCounts.canonical ?? 0,
      duplicateFormulas: statusCounts.duplicate ?? 0,
      missingDefinitions: statusCounts.missing_definition ?? 0,
      needsOperatorDecision: statusCounts.needs_operator_decision ?? 0,
    },
    scoreBefore,
    scoreAfter,
    dirtyFiles,
    openPullRequests,
    validationFailures,
    nextExactSteps: [
      "Use formulaId references before displaying any new user/admin metric.",
      "Resolve needs_operator_decision formulas in later Math Batch phases without changing payment or GumDrop math silently.",
      "Keep legacy data non-exact until source identity/event truth supports exact confidence.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(validationFailures.join("\n"));
    process.exit(1);
  }

  console.log(`canonical-math-authority-ledger pass: ${REPORT_PATH}`);
}

main();
