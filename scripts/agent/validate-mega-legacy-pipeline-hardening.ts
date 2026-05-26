import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  LEGACY_PIPELINE_INVENTORY,
  summarizeLegacyPipelineInventory,
  type LegacyPipelineAction,
} from "@/lib/codebase-hardening/legacy-pipeline-inventory";
import { auditPipelineOwnership, expectedOwnershipStagesPresent } from "@/lib/codebase-hardening/pipeline-ownership-auditor";
import type { PipelineOwnershipAuditReport } from "@/lib/codebase-hardening/pipeline-ownership-contract";
import { auditGlobalFormulas, type GlobalFormulaAuditReport } from "@/lib/math/global-formula-audit";
import { buildLegacyCanonicalRecoveryPlan, type LegacyCanonicalRecoveryPlan } from "@/lib/codebase-hardening/legacy-canonical-recovery-plan";
import { buildCostAccuracyHardeningReport, validateCostAccuracyHardeningReport, type CostAccuracyHardeningReport } from "@/lib/codebase-hardening/cost-accuracy-hardening";
import {
  buildCodebaseOrganizationHardeningSummary,
  validateCodebaseOrganizationHardeningSummary,
  type CodebaseOrganizationHardeningSummary,
} from "@/lib/codebase-hardening/codebase-organization-hardening";
import {
  buildSelfRevealingCodebaseReport,
  validateSelfRevealingCodebaseReport,
  type SelfRevealingCodebaseReport,
} from "@/lib/codebase-hardening/self-revealing-codebase-engine";

const ROOT = process.cwd();

const STATE_DOC_PAIRS = [
  ["agent/state/legacy-pipeline-inventory.generated.json", "docs/agent-truth/legacy-pipeline-inventory.md"],
  ["agent/state/pipeline-ownership-audit.generated.json", "docs/agent-truth/pipeline-ownership-audit.md"],
  ["agent/state/global-formula-audit.generated.json", "docs/agent-truth/global-formula-audit.md"],
  ["agent/state/legacy-canonical-recovery-plan.generated.json", "docs/agent-truth/legacy-canonical-recovery-plan.md"],
  ["agent/state/cost-accuracy-hardening.generated.json", "docs/agent-truth/cost-accuracy-hardening.md"],
  ["agent/state/codebase-organization-hardening.generated.json", "docs/agent-truth/codebase-organization-hardening.md"],
  ["agent/state/codex-execution-guardrails.generated.json", "docs/agent-truth/codex-execution-guardrails.md"],
  ["agent/state/self-revealing-codebase.generated.json", "docs/agent-truth/self-revealing-codebase.md"],
  ["agent/state/mega-legacy-pipeline-hardening.generated.json", "docs/agent-truth/mega-legacy-pipeline-hardening.md"],
] as const;

export type MegaLegacyDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "legacy_alias_to_document"
  | "dry_run_recovery_artifact_expected"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

export type MegaLegacyPipelineHardeningReport = {
  reportKey: "mega-legacy-pipeline-hardening";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  productionMutationPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  paymentRuntimeChanged: false;
  walletRuntimeChanged: false;
  paypalRuntimeChanged: false;
  pricesOrPackagesChanged: false;
  gumdropPricingMathChanged: false;
  topBottomNavChanged: false;
  evidenceFaked: false;
  inventorySummary: ReturnType<typeof summarizeLegacyPipelineInventory>;
  pipelineOwnership: PipelineOwnershipAuditReport;
  globalFormulaAudit: GlobalFormulaAuditReport;
  legacyRecoveryPlan: LegacyCanonicalRecoveryPlan;
  costAccuracyHardening: CostAccuracyHardeningReport;
  codebaseOrganizationHardening: CodebaseOrganizationHardeningSummary;
  selfRevealingCodebase: SelfRevealingCodebaseReport;
  dirtyFiles: Array<{ path: string; classification: MegaLegacyDirtyClassification }>;
  openPullRequests: Array<{ number: unknown; title: unknown; url?: unknown; mergeStateStatus?: unknown; isDraft?: unknown; classification: string; reason: string }>;
  artifactsWritten: string[];
  validationFailures: string[];
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): Record<string, unknown> {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function currentHead() {
  return run("git", ["rev-parse", "HEAD"]);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function packageScripts() {
  const packageJson = readJson("package.json");
  return packageJson.scripts && typeof packageJson.scripts === "object" && !Array.isArray(packageJson.scripts)
    ? packageJson.scripts as Record<string, string>
    : {};
}

function classifyOpenPr(title: unknown) {
  const text = String(title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(text)) return "dependency_update_external_review_required";
  if (/onboarding/iu.test(text)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(text)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility/iu.test(text)) return "architecture_refactor_external_review_required";
  if (/security|sentinel|Math\.random/iu.test(text)) return "security_patch_external_review_required";
  if (/loading states|palette|accessib/iu.test(text)) return "accessibility_patch_external_review_required";
  if (/bolt|Map lookup|performance/iu.test(text)) return "performance_patch_external_review_required";
  return "external_review_required";
}

function openPullRequests() {
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      mergeStateStatus: pr.mergeStateStatus,
      isDraft: pr.isDraft,
      classification: classifyOpenPr(pr.title),
      reason: "Open PR is outside this source-only hardening lock; merge/cherry-pick requires separate current-source review.",
    }));
  } catch {
    return [{
      number: 0,
      title: "gh pr list parse failed",
      classification: "external_review_required",
      reason: "PR list could not be parsed.",
    }];
  }
}

export function classifyMegaLegacyPipelineDirtyFile(filePath: string): MegaLegacyDirtyClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(mega-legacy-pipeline-hardening|legacy-pipeline-inventory|pipeline-ownership-audit|global-formula-audit|legacy-canonical-recovery-plan|cost-accuracy-hardening|codebase-organization-hardening|codex-execution-guardrails|self-revealing-codebase|public-beta-score)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(mega-legacy-pipeline-hardening|legacy-pipeline-inventory|pipeline-ownership-audit|global-formula-audit|legacy-canonical-recovery-plan|cost-accuracy-hardening|codebase-organization-hardening|codex-execution-guardrails|self-revealing-codebase)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(mega-legacy-pipeline-hardening|codebase-organization-hardening)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(mega-legacy-pipeline-hardening|codebase-organization-hardening)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/codebase-hardening\//u.test(normalized) || normalized === "src/lib/math/global-formula-audit.ts") return "real_source_change_needs_review";
  if (/^(CHANGELOG\.md|public\/kandydrops-release-notes\.json|src\/lib\/release-notes\/public-release-notes\.ts|src\/lib\/release-notes\/release-version-contract\.ts)$/u.test(normalized)) return "release_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (/paypal|payment|wallet|capture|provider|gumdrop.*pricing|src\/app\/api\/paypal/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function codexGuardrailsReport(generatedAtUtc: string) {
  return {
    reportKey: "codex-execution-guardrails",
    generatedAtUtc,
    status: "pass",
    sourceOnly: true,
    guardrails: [
      "Start with status, recent commits, dirty/untracked classification, and open PR classification.",
      "Build a touched-file plan before editing and read adjacent contracts.",
      "Use package script inventory and add validator plus unit test for new checks.",
      "Do not hide evidence, do not promote source checks into formal runtime/provider/admin proof, and explain accuracy/cost tradeoffs.",
      "Finish with stale/legacy/orphan search and scoped staging only; do not use git add -A.",
    ],
  };
}

function renderDoc(title: string, payload: unknown) {
  return [
    `# ${title}`,
    "",
    "Source-only hardening artifact. It does not run production reads, provider calls, exports, deploys, or mutate legacy/production data.",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
  ].join("\n");
}

export function buildMegaLegacyPipelineHardeningReport(input?: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  openPullRequests?: Array<Record<string, unknown>>;
  packageScripts?: Record<string, string>;
}): MegaLegacyPipelineHardeningReport {
  const generatedAtUtc = input?.generatedAtUtc ?? new Date().toISOString();
  const scripts = input?.packageScripts ?? packageScripts();
  const dirtyFiles = [...(input?.dirtyFiles ?? currentDirtyFiles())].map((path) => ({
    path,
    classification: classifyMegaLegacyPipelineDirtyFile(path),
  }));
  const openPrs = input?.openPullRequests?.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergeStateStatus: pr.mergeStateStatus,
    isDraft: pr.isDraft,
    classification: classifyOpenPr(pr.title),
    reason: "Open PR is outside this source-only hardening lock; merge/cherry-pick requires separate current-source review.",
  })) ?? openPullRequests();
  const pipelineOwnership = auditPipelineOwnership({ generatedAtUtc });
  const globalFormulaAudit = auditGlobalFormulas({ generatedAtUtc });
  const legacyRecoveryPlan = buildLegacyCanonicalRecoveryPlan({ generatedAtUtc });
  const costAccuracyHardening = buildCostAccuracyHardeningReport({ generatedAtUtc });
  const codebaseOrganizationHardening = buildCodebaseOrganizationHardeningSummary({
    generatedAtUtc,
    packageScripts: scripts,
    dirtyFiles: input?.dirtyFiles ?? currentDirtyFiles(),
    openPullRequests: openPrs.map((pr) => ({ number: pr.number, title: pr.title })),
  });
  const selfRevealingCodebase = buildSelfRevealingCodebaseReport({ generatedAtUtc });
  const artifactsWritten = STATE_DOC_PAIRS.flatMap(([state, doc]) => [state, doc]);

  const report: MegaLegacyPipelineHardeningReport = {
    reportKey: "mega-legacy-pipeline-hardening",
    generatedAtUtc,
    currentHead: input?.currentHead ?? currentHead(),
    status: "pass",
    productionReadsPerformed: false,
    productionMutationPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    paymentRuntimeChanged: false,
    walletRuntimeChanged: false,
    paypalRuntimeChanged: false,
    pricesOrPackagesChanged: false,
    gumdropPricingMathChanged: false,
    topBottomNavChanged: false,
    evidenceFaked: false,
    inventorySummary: summarizeLegacyPipelineInventory(LEGACY_PIPELINE_INVENTORY),
    pipelineOwnership,
    globalFormulaAudit,
    legacyRecoveryPlan,
    costAccuracyHardening,
    codebaseOrganizationHardening,
    selfRevealingCodebase,
    dirtyFiles,
    openPullRequests: openPrs,
    artifactsWritten,
    validationFailures: [],
  };
  const validationFailures = validateMegaLegacyPipelineHardeningReport(report);
  return { ...report, status: validationFailures.length ? "fail" : "pass", validationFailures };
}

export function validateMegaLegacyPipelineHardeningReport(report: MegaLegacyPipelineHardeningReport) {
  const failures: string[] = [];
  if (report.productionReadsPerformed || report.productionMutationPerformed) failures.push("Production reads or mutations were performed.");
  if (report.providerCallsPerformed || report.deployPerformed) failures.push("Provider calls or deploys were performed.");
  if (report.paymentRuntimeChanged || report.walletRuntimeChanged || report.paypalRuntimeChanged) failures.push("Payment, wallet, or PayPal runtime changed.");
  if (report.pricesOrPackagesChanged || report.gumdropPricingMathChanged) failures.push("Prices/packages or GumDrop pricing math changed.");
  if (report.evidenceFaked) failures.push("Evidence was faked.");
  const actionKeys: LegacyPipelineAction[] = ["remove", "reinforce_into_pipeline", "legacy_alias", "dry_run_recovery", "leave_in_flight", "unsafe_unknown"];
  for (const action of actionKeys) {
    if (typeof report.inventorySummary.actions[action] !== "number") failures.push(`${action} inventory action missing.`);
  }
  if (report.inventorySummary.unsafeUnknownCount > 0) failures.push("Unsafe unknown legacy inventory remains.");
  if (report.pipelineOwnership.status === "fail") failures.push("Pipeline ownership audit failed.");
  if (!expectedOwnershipStagesPresent(report.pipelineOwnership.ownershipStages)) failures.push("Pipeline ownership stages are incomplete.");
  if (report.globalFormulaAudit.status !== "pass") failures.push("Global formula audit failed.");
  if (!report.globalFormulaAudit.personMetricHydrationGapMath.debugLaneUsesActualGapCount) failures.push("Person metrics debug lane does not use actual gap count.");
  if (!report.legacyRecoveryPlan.dryRunOnly || report.legacyRecoveryPlan.productionMutationAllowed) failures.push("Legacy recovery is not dry-run only.");
  failures.push(...validateCostAccuracyHardeningReport(report.costAccuracyHardening));
  failures.push(...validateCodebaseOrganizationHardeningSummary(report.codebaseOrganizationHardening));
  failures.push(...validateSelfRevealingCodebaseReport(report.selfRevealingCodebase));
  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unsafe_unknown for mega legacy pipeline hardening.`);
  }
  if (!report.openPullRequests.every((pr) => pr.classification && pr.reason)) failures.push("Open PRs are unclassified.");
  return failures;
}

export function buildAndWriteMegaLegacyPipelineHardeningReport() {
  const report = buildMegaLegacyPipelineHardeningReport();
  const generatedAtUtc = report.generatedAtUtc;
  const individualArtifacts: Array<[string, string, unknown]> = [
    ["agent/state/legacy-pipeline-inventory.generated.json", "docs/agent-truth/legacy-pipeline-inventory.md", { reportKey: "legacy-pipeline-inventory", generatedAtUtc, inventory: LEGACY_PIPELINE_INVENTORY, summary: report.inventorySummary }],
    ["agent/state/pipeline-ownership-audit.generated.json", "docs/agent-truth/pipeline-ownership-audit.md", report.pipelineOwnership],
    ["agent/state/global-formula-audit.generated.json", "docs/agent-truth/global-formula-audit.md", report.globalFormulaAudit],
    ["agent/state/legacy-canonical-recovery-plan.generated.json", "docs/agent-truth/legacy-canonical-recovery-plan.md", report.legacyRecoveryPlan],
    ["agent/state/cost-accuracy-hardening.generated.json", "docs/agent-truth/cost-accuracy-hardening.md", report.costAccuracyHardening],
    ["agent/state/codebase-organization-hardening.generated.json", "docs/agent-truth/codebase-organization-hardening.md", report.codebaseOrganizationHardening],
    ["agent/state/codex-execution-guardrails.generated.json", "docs/agent-truth/codex-execution-guardrails.md", codexGuardrailsReport(generatedAtUtc)],
    ["agent/state/self-revealing-codebase.generated.json", "docs/agent-truth/self-revealing-codebase.md", report.selfRevealingCodebase],
    ["agent/state/mega-legacy-pipeline-hardening.generated.json", "docs/agent-truth/mega-legacy-pipeline-hardening.md", report],
  ];
  for (const [statePath, docPath, payload] of individualArtifacts) {
    write(statePath, `${JSON.stringify(payload, null, 2)}\n`);
    write(docPath, renderDoc(docPath.replace(/^docs\/agent-truth\//u, "").replace(/\.md$/u, "").replace(/-/gu, " "), payload));
  }
  return report;
}

function main() {
  const report = buildAndWriteMegaLegacyPipelineHardeningReport();
  const failures = validateMegaLegacyPipelineHardeningReport(report);
  if (failures.length > 0) {
    console.error(`Mega legacy pipeline hardening failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Mega legacy pipeline hardening validated: inventory=${report.inventorySummary.total}, openPrs=${report.openPullRequests.length}.`);
}

if (require.main === module) {
  main();
}
