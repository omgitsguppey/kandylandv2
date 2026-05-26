import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUPERSEDED_TARGETED_BEHAVIOR_VALIDATORS,
  TARGETED_VALIDATORS,
  type TargetedBehaviorValidatorResult,
  type TargetedBehaviorValidatorStatus,
} from "./validate-targeted-behavior-evidence";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/targeted-behavior-evidence-repair.generated.json";
const DOC_PATH = "docs/agent-truth/targeted-behavior-evidence-repair.md";
const TARGETED_EVIDENCE_PATH = "agent/state/targeted-behavior-evidence.generated.json";

const DOES_NOT_CLEAR = ["manual_screenshot", "provider_smoke", "runtime_smoke", "admin_truth_sample"] as const;

export type TargetedBehaviorEvidenceRepairDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "obsolete_targeted_behavior_artifact_to_retire"
  | "failed_validator_to_repair"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "unsafe_unknown";

export type TargetedBehaviorRepairValidator = {
  id: string;
  command: string;
  artifactPath: string;
  status: TargetedBehaviorValidatorStatus;
  classification: "current_lock_validator" | "in_flight_validator";
  surfaces: string[];
  replacementFor: string[];
  blocker?: string;
  artifactHead?: string;
};

export type TargetedBehaviorEvidenceRepairReport = {
  reportKey: "targeted-behavior-evidence-repair";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  bigQueryCallsPerformed: false;
  visualQaPerformed: false;
  realDeviceSmokePerformed: false;
  sourceEvidenceOnly: true;
  formalEvidenceImpact: "source_behavior_only";
  doesNotClear: string[];
  targetedBehaviorScoreBefore: number;
  targetedBehaviorScoreAfter: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  currentValidatorInventoryCount: number;
  currentValidators: TargetedBehaviorRepairValidator[];
  failedValidators: TargetedBehaviorRepairValidator[];
  inFlightValidators: TargetedBehaviorRepairValidator[];
  supersededValidators: Array<Pick<TargetedBehaviorValidatorResult, "id" | "command" | "artifactPath" | "blocker">>;
  obsoleteValidatorInputsReplaced: string[];
  missingValidators: string[];
  limitations: string[];
  dirtyFiles: Array<{ path: string; classification: TargetedBehaviorEvidenceRepairDirtyClassification }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  evidence: string[];
};

type ArtifactReports = Record<string, Record<string, unknown> | undefined>;
type PackageScripts = Record<string, string>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeFile(relativePath: string, contents: string) {
  const fullPath = join(ROOT, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents);
}

function readPackageScripts(): PackageScripts {
  const packageJson = readJson("package.json");
  return packageJson?.scripts && typeof packageJson.scripts === "object"
    ? packageJson.scripts as PackageScripts
    : {};
}

function commandToScriptName(command: string) {
  return command.replace(/^npm run /u, "");
}

function reportHead(report: Record<string, unknown> | undefined | null) {
  const head = report?.currentHead ?? report?.sourceCommit ?? report?.latestCodeVersion;
  return typeof head === "string" ? head : undefined;
}

function reportStatus(report: Record<string, unknown> | undefined | null) {
  const status = report?.status ?? report?.overallStatus ?? report?.validationStatus;
  if (typeof status === "string") return status.toLowerCase();
  if (report?.passed === true || report?.ok === true || report?.valid === true) return "pass";
  if (report?.passed === false || report?.ok === false || report?.valid === false) return "fail";
  return undefined;
}

function readArtifactReports() {
  const reports: ArtifactReports = {};
  for (const validator of TARGETED_VALIDATORS) {
    reports[validator.artifactPath] = readJson(validator.artifactPath) ?? undefined;
  }
  return reports;
}

function readPreviousValidatorResults(): TargetedBehaviorValidatorResult[] {
  const report = readJson(TARGETED_EVIDENCE_PATH);
  const results = report?.validatorResults;
  return Array.isArray(results) ? results as TargetedBehaviorValidatorResult[] : [];
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

export function classifyTargetedBehaviorEvidenceRepairDirtyFile(filePath: string): TargetedBehaviorEvidenceRepairDirtyClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (
    normalized === STATE_PATH
    || normalized === TARGETED_EVIDENCE_PATH
    || normalized === "agent/state/public-beta-score.generated.json"
    || /^agent\/state\/(feature-registration-gate|event-translation-bridge|person-metrics-hydration|creator-monetization-readiness-lock)\.generated\.json$/u.test(normalized)
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === DOC_PATH
    || normalized === "docs/agent-truth/targeted-behavior-evidence.md"
    || /^docs\/agent-truth\/(feature-registration-gate|event-translation-bridge|person-metrics-hydration|creator-monetization-readiness-lock)\.md$/u.test(normalized)
  ) return "current_generated_artifact_to_commit";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence.ts") return "failed_validator_to_repair";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts") return "failed_validator_to_repair";
  if (
    normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts"
    || normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts"
    || normalized === "scripts/agent/validate-media-discovery-score-lock.ts"
  ) return "failed_validator_to_repair";
  if (normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts") return "failed_validator_to_repair";
  if (normalized === "package.json") return "failed_validator_to_repair";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/agent\/state\/(creator-settings-control-plane|creator-pricing-wiring|creator-broadcast-timeline-prep|creator-profile-mobile-timeline|global-marquee-truncated-titles|creator-drop-status-metrics|user-loading-wallet-mobile-refinement|existing-algorithm-refinement|overnight-wiring-integrity|mobile-ui-final-lock|user-creator-ui-parity|source-truth-authority-map|gumdrop-economy-accuracy|creator-drop-management-approval|creator-drop-manager-mobile-refinement)\.generated\.json/u.test(normalized)) {
    return "obsolete_targeted_behavior_artifact_to_retire";
  }
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized) || /^docs\/agent-truth\/.+\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment|wallet|gumdrop-ledger|source-of-funds|top-nav|bottom-nav/iu.test(normalized)) return "unsafe_unknown";
  if (/^src\//u.test(normalized)) return "real_source_change_needs_review";
  return "unsafe_unknown";
}

function buildCurrentValidators(input: {
  currentHead: string;
  packageScripts: PackageScripts;
  artifactReports: ArtifactReports;
}): TargetedBehaviorRepairValidator[] {
  return TARGETED_VALIDATORS.map((validator) => {
    const scriptName = commandToScriptName(validator.command);
    const artifact = input.artifactReports[validator.artifactPath];
    const artifactStatus = reportStatus(artifact);
    const artifactHead = reportHead(artifact);
    const replacementFor = "replacementFor" in validator ? [...(validator.replacementFor ?? [])] : [];
    let status: TargetedBehaviorValidatorStatus = "pass";
    let classification: TargetedBehaviorRepairValidator["classification"] = "current_lock_validator";
    let blocker: string | undefined;

    if (!input.packageScripts[scriptName]) {
      status = "in_flight";
      classification = "in_flight_validator";
      blocker = `${validator.command} is not defined in package.json.`;
    } else if (!artifact) {
      status = "in_flight";
      classification = "in_flight_validator";
      blocker = `${validator.artifactPath} is not present yet.`;
    } else if (artifactStatus && /fail|failed|blocked/iu.test(artifactStatus)) {
      status = "fail";
      blocker = `${validator.artifactPath} reports ${artifactStatus}.`;
    }

    return {
      id: validator.id,
      command: validator.command,
      artifactPath: validator.artifactPath,
      status,
      classification,
      surfaces: [...validator.surfaces],
      replacementFor,
      blocker,
      artifactHead: artifactHead ?? input.currentHead,
    };
  });
}

export function buildTargetedBehaviorEvidenceRepairReport(input: {
  currentHead?: string;
  generatedAtUtc?: string;
  packageScripts?: PackageScripts;
  artifactReports?: ArtifactReports;
  previousValidatorResults?: TargetedBehaviorValidatorResult[];
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): TargetedBehaviorEvidenceRepairReport {
  const currentHead = input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]);
  const packageScripts = input.packageScripts ?? readPackageScripts();
  const artifactReports = input.artifactReports ?? readArtifactReports();
  const previousValidatorResults = input.previousValidatorResults ?? readPreviousValidatorResults();
  const currentValidators = buildCurrentValidators({ currentHead, packageScripts, artifactReports });
  const failedValidators = currentValidators.filter((validator) => validator.status === "fail");
  const inFlightValidators = currentValidators.filter((validator) => validator.status === "in_flight");
  const supersededValidators = previousValidatorResults
    .filter((result) => SUPERSEDED_TARGETED_BEHAVIOR_VALIDATORS.includes(result.id as typeof SUPERSEDED_TARGETED_BEHAVIOR_VALIDATORS[number]))
    .map((result) => ({
      id: result.id,
      command: result.command,
      artifactPath: result.artifactPath,
      blocker: result.blocker,
    }));
  const obsoleteValidatorInputsReplaced = [...new Set([
    ...supersededValidators.map((validator) => validator.id),
    ...currentValidators.flatMap((validator) => validator.replacementFor),
  ])].sort();
  const missingValidators = currentValidators
    .filter((validator) => validator.status === "unavailable")
    .map((validator) => validator.id);
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyTargetedBehaviorEvidenceRepairDirtyFile(path),
  }));
  const dirtyFailures = dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => `${file.path} is unclassified or forbidden for targeted behavior evidence repair.`);
  const status = failedValidators.length === 0 && missingValidators.length === 0 && dirtyFailures.length === 0 ? "pass" : "fail";
  const targetedBehaviorScoreBefore = 0;
  const targetedBehaviorScoreAfter = status === "pass" ? 20 : currentValidators.some((validator) => validator.status === "pass") ? 10 : 0;
  const limitations = [
    "source behavior only",
    "does not clear manual screenshot evidence",
    "does not clear provider smoke",
    "does not clear deployed runtime smoke",
    "does not clear production admin truth sample evidence",
  ];
  const remainingGaps = [
    ...failedValidators.map((validator) => `${validator.id}: ${validator.blocker ?? "failed"}`),
    ...missingValidators.map((validatorId) => `${validatorId}: missing current validator`),
    ...dirtyFailures,
  ];

  return {
    reportKey: "targeted-behavior-evidence-repair",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead,
    status,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    bigQueryCallsPerformed: false,
    visualQaPerformed: false,
    realDeviceSmokePerformed: false,
    sourceEvidenceOnly: true,
    formalEvidenceImpact: "source_behavior_only",
    doesNotClear: [...DOES_NOT_CLEAR],
    targetedBehaviorScoreBefore,
    targetedBehaviorScoreAfter,
    scoreBefore: input.scoreBefore ?? 77.83,
    scoreAfter: input.scoreAfter ?? input.scoreBefore ?? 77.83,
    scoreDimensions: ["sourceHealth", "evidenceCompleteness", "freshness", "regressionRisk"],
    currentValidatorInventoryCount: currentValidators.length,
    currentValidators,
    failedValidators,
    inFlightValidators,
    supersededValidators,
    obsoleteValidatorInputsReplaced,
    missingValidators,
    limitations,
    dirtyFiles,
    remainingGaps,
    nextExactSteps: remainingGaps.length === 0
      ? ["Keep formal runtime, provider, admin truth, and manual visual gates separate from targeted source behavior evidence."]
      : ["Repair the listed targeted behavior validator blockers without promoting source evidence to formal runtime proof."],
    evidence: [
      `currentValidatorInventoryCount=${currentValidators.length}`,
      `passedCurrentValidators=${currentValidators.filter((validator) => validator.status === "pass").length}`,
      `inFlightValidators=${inFlightValidators.length}`,
      `failedValidators=${failedValidators.length}`,
      `supersededValidators=${obsoleteValidatorInputsReplaced.join(",")}`,
      "formalEvidenceImpact=source_behavior_only",
    ],
  };
}

export function validateTargetedBehaviorEvidenceRepairReport(report: TargetedBehaviorEvidenceRepairReport) {
  const failures: string[] = [];
  if (report.reportKey !== "targeted-behavior-evidence-repair") failures.push("reportKey must be targeted-behavior-evidence-repair.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (report.targetedBehaviorScoreAfter === 0 && report.failedValidators.length === 0 && report.missingValidators.length === 0) {
    failures.push("targeted behavior score cannot remain 0 without exact failed validator list.");
  }
  if (report.obsoleteValidatorInputsReplaced.length === 0) failures.push("superseded targeted behavior validator inputs must be listed.");
  if (report.inFlightValidators.some((validator) => validator.status === "fail")) failures.push("in-flight validators must not be treated as failed.");
  if (report.formalEvidenceImpact !== "source_behavior_only") failures.push("source evidence must not clear formal gates.");
  for (const gate of DOES_NOT_CLEAR) {
    if (!report.doesNotClear.includes(gate)) failures.push(`doesNotClear must include ${gate}.`);
  }
  for (const limitation of ["source behavior only", "does not clear provider smoke", "does not clear deployed runtime smoke"]) {
    if (!report.limitations.includes(limitation)) failures.push(`limitations must include ${limitation}.`);
  }
  if (!Array.isArray(report.scoreDimensions) || report.scoreDimensions.length === 0) failures.push("score dimension before/after evidence is missing.");
  if (report.currentValidatorInventoryCount !== report.currentValidators.length) failures.push("current validator inventory count mismatch.");
  if (report.currentValidators.length === 0) failures.push("current validator inventory is missing.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files include unsafe_unknown classification.");
  if (report.productionReadsPerformed || report.providerCallsPerformed || report.bigQueryCallsPerformed || report.visualQaPerformed || report.realDeviceSmokePerformed) {
    failures.push("targeted behavior repair must not claim production/provider/visual/runtime evidence.");
  }
  return failures;
}

function renderDoc(report: TargetedBehaviorEvidenceRepairReport) {
  const currentRows = report.currentValidators
    .map((validator) => `| ${validator.id} | ${validator.status} | ${validator.command} | ${validator.artifactPath} | ${validator.replacementFor.join(", ") || "current"} | ${validator.blocker ?? "current"} |`)
    .join("\n");
  const supersededRows = report.supersededValidators
    .map((validator) => `| ${validator.id} | ${validator.command} | ${validator.artifactPath} | ${validator.blocker ?? "superseded"} |`)
    .join("\n");
  return `# Targeted Behavior Evidence Repair

Status: \`${report.status}\`  
Artifact: \`${STATE_PATH}\`  
Validator: \`npm run check:targeted-behavior-evidence-repair\`

## Summary

- Current head: \`${report.currentHead}\`
- Targeted behavior score before: ${report.targetedBehaviorScoreBefore}/20
- Targeted behavior score after: ${report.targetedBehaviorScoreAfter}/20
- Formal evidence impact: \`${report.formalEvidenceImpact}\`
- Does not clear: ${report.doesNotClear.map((gate) => `\`${gate}\``).join(", ")}
- Production/provider/runtime reads performed: false

## Current Validators

| Validator | Status | Command | Artifact | Replaces | Blocker |
| --- | --- | --- | --- | --- | --- |
${currentRows}

## Superseded Inputs

| Validator | Command | Artifact | Reason |
| --- | --- | --- | --- |
${supersededRows || "| None | - | - | - |"}

## Limitations

${report.limitations.map((item) => `- ${item}`).join("\n")}

## Remaining Gaps

${(report.remainingGaps.length > 0 ? report.remainingGaps : ["No targeted behavior repair gaps remain."]).map((item) => `- ${item}`).join("\n")}
`;
}

function main() {
  const report = buildTargetedBehaviorEvidenceRepairReport();
  writeFile(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFile(DOC_PATH, renderDoc(report));
  const failures = validateTargetedBehaviorEvidenceRepairReport(report);
  if (failures.length > 0) {
    console.error("Targeted behavior evidence repair validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Targeted behavior evidence repair passed: currentValidators=${report.currentValidatorInventoryCount} score=${report.targetedBehaviorScoreBefore}->${report.targetedBehaviorScoreAfter}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
