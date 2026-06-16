import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  GENERATED_REPORT_DEFAULT_STALE_HOURS,
  GENERATED_REPORT_SCAN_ROOTS,
  deriveGeneratedReportFreshness,
  isGeneratedReportPath,
} from "../../src/lib/generated-reports/generated-report-contract";
import { ensureDirectory, getPackageScripts, nowIso, writeJsonFile, writeTextFile, type Json } from "./shared";

const REPORT_PATH = "agent/state/evidence-freshness-index.generated.json";
const DOC_PATH = "docs/agent-truth/evidence-freshness-index.md";
const ADMIN_DEBUG_REGISTRY_PATH = "src/lib/admin-debug-control-tower.ts";
const MAX_INDEX_ROWS = 160;
const MAX_ARCHIVE_CANDIDATES = 40;

type FreshnessClassification =
  | "fresh_and_consumed"
  | "fresh_but_unused"
  | "stale_harmless"
  | "stale_consumed"
  | "missing_expected"
  | "manual_visual_required"
  | "admin_truth_source_required"
  | "external_proof_required"
  | "archive_candidate";

type EvidenceFreshnessActionability =
  | "refreshable_by_existing_local_validator"
  | "external_proof_required"
  | "manual_visual_required"
  | "admin_truth_source_required"
  | "archive_evidence_only"
  | "stale_consumed_blocking"
  | "missing_expected_blocking"
  | "no_action_required";

type EvidenceFreshnessEntry = {
  path: string;
  classification: FreshnessClassification;
  actionability: EvidenceFreshnessActionability;
  generatedAtUtc: string | null;
  ageHours: number | null;
  staleAfterHours: number;
  producerCommand: string | null;
  consumerPaths: string[];
  consumedBy: string[];
  required: boolean;
  exists: boolean;
  blocking: boolean;
  truthUse: "current_truth_when_fresh" | "evidence_snapshot_only" | "formal_proof_gate" | "archive_only";
  reason: string;
  nextExactSteps: string[];
};

type AdminDebugReportDefinition = {
  fileName: string;
  command: string;
  required: boolean;
};

function readText(path: string) {
  return readFileSync(path, "utf8");
}

function readJsonRecord(path: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(readText(path));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function walkFiles(root: string, results: string[] = []) {
  if (!existsSync(root)) return results;
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, results);
      continue;
    }
    results.push(fullPath.replace(/\\/g, "/"));
  }
  return results;
}

function listGeneratedArtifacts() {
  return GENERATED_REPORT_SCAN_ROOTS
    .flatMap((root) => walkFiles(root))
    .filter(isGeneratedReportPath)
    .sort((left, right) => left.localeCompare(right));
}

function readString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function generatedAtFor(path: string) {
  const record = readJsonRecord(path);
  return readString(record, ["generatedAtUtc", "generatedAt", "createdAtUtc", "updatedAtUtc"]);
}

function ageHours(generatedAt: string | null, nowMs: number) {
  if (!generatedAt) return null;
  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) return null;
  return Math.max(0, Math.round(((nowMs - generatedAtMs) / 3_600_000) * 10) / 10);
}

function parseAdminDebugRegistry(): Map<string, AdminDebugReportDefinition> {
  if (!existsSync(ADMIN_DEBUG_REGISTRY_PATH)) return new Map();
  const source = readText(ADMIN_DEBUG_REGISTRY_PATH);
  const definitions = new Map<string, AdminDebugReportDefinition>();
  const objectPattern = /\{[^{}]*fileName:\s*"([^"]+)"[^{}]*command:\s*"([^"]+)"[^{}]*\}/gu;
  for (const match of source.matchAll(objectPattern)) {
    const block = match[0];
    const fileName = match[1];
    const command = match[2];
    definitions.set(`agent/state/${fileName}`, {
      fileName,
      command,
      required: /required:\s*true/u.test(block),
    });
  }
  return definitions;
}

function buildConsumerIndex(paths: string[]) {
  const sourceFiles = [
    "src/lib/admin-debug-control-tower.ts",
    ...walkFiles("scripts/agent").filter((path) => /\.(?:ts|tsx|js|mjs|cjs)$/u.test(path)),
    ...walkFiles("agent/index").filter((path) => path.endsWith(".json")),
    ...walkFiles("agent/context").filter((path) => path.endsWith(".json") || path.endsWith(".jsonl")),
  ].filter((path) => existsSync(path));
  const consumerIndex = new Map<string, string[]>();

  for (const consumerPath of sourceFiles) {
    const source = readText(consumerPath);
    for (const path of paths) {
      const fileName = path.split("/").pop() ?? path;
      if (source.includes(path) || source.includes(fileName)) {
        const consumers = consumerIndex.get(path) ?? [];
        consumers.push(consumerPath);
        consumerIndex.set(path, consumers);
      }
    }
  }

  return consumerIndex;
}

function commandForArtifact(path: string, adminRegistry: Map<string, AdminDebugReportDefinition>, packageScripts: Record<string, string>) {
  const adminCommand = adminRegistry.get(path)?.command;
  if (adminCommand) return adminCommand;

  const fileStem = path.split("/").pop()?.replace(/\.generated\.json$/u, "").replace(/\.json$/u, "") ?? "";
  const normalizedStem = fileStem.replace(/-score$/u, "");
  for (const [scriptName, command] of Object.entries(packageScripts)) {
    if (command.includes(fileStem) || command.includes(normalizedStem) || scriptName.includes(normalizedStem)) {
      return `npm run ${scriptName}`;
    }
  }

  if (path.startsWith("agent/index/")) return "npm run agent:index";
  if (path.startsWith("agent/context/")) return "npm run check:agent-context";
  return null;
}

function isFormalExternalPath(path: string) {
  return /provider-smoke|runtime-smoke|runtime-provider|billing|paypal/iu.test(path);
}

function isAdminTruthSourcePath(path: string) {
  return /admin-truth-sample/iu.test(path);
}

function isManualVisualPath(path: string) {
  return /manual-screenshot|operator-final|visual-manual/iu.test(path);
}

function truthUseFor(classification: FreshnessClassification): EvidenceFreshnessEntry["truthUse"] {
  if (classification === "external_proof_required" || classification === "manual_visual_required") return "formal_proof_gate";
  if (classification === "archive_candidate" || classification === "stale_harmless") return "archive_only";
  if (classification === "fresh_and_consumed") return "current_truth_when_fresh";
  return "evidence_snapshot_only";
}

function actionabilityFor(input: {
  classification: FreshnessClassification;
  blocking: boolean;
  producerCommand: string | null;
}): EvidenceFreshnessActionability {
  if (input.classification === "external_proof_required") return "external_proof_required";
  if (input.classification === "manual_visual_required") return "manual_visual_required";
  if (input.classification === "admin_truth_source_required") return "admin_truth_source_required";
  if (input.classification === "archive_candidate" || input.classification === "stale_harmless") return "archive_evidence_only";
  if (input.classification === "missing_expected" && input.blocking) return "missing_expected_blocking";
  if (input.classification === "stale_consumed" && input.blocking && input.producerCommand) return "refreshable_by_existing_local_validator";
  if (input.classification === "stale_consumed" && input.blocking) return "stale_consumed_blocking";
  return "no_action_required";
}

function nextStepsFor(input: {
  path: string;
  actionability: EvidenceFreshnessActionability;
  producerCommand: string | null;
}) {
  switch (input.actionability) {
    case "refreshable_by_existing_local_validator":
      return [
        `Run ${input.producerCommand} to refresh ${input.path}.`,
        "Review the refreshed artifact diff before treating it as current generated evidence.",
      ];
    case "external_proof_required":
      return [
        `Collect formal external/runtime/provider evidence for ${input.path} through the owning operator process.`,
        "Do not clear this gate with source-only validators.",
      ];
    case "manual_visual_required":
      return [
        `Attach final visual/operator QA evidence for ${input.path}.`,
        "Do not use source-only validators to clear final visual QA.",
      ];
    case "admin_truth_source_required":
      return [
        input.producerCommand ? `Run ${input.producerCommand} with an approved redacted admin truth sample for ${input.path}.` : `Attach or refresh an approved redacted admin truth sample for ${input.path}.`,
        "Do not use raw user data or provider credentials as proof.",
      ];
    case "archive_evidence_only":
      return [
        `Treat ${input.path} as archive/evidence-only until an owner requests refresh or removal.`,
      ];
    case "missing_expected_blocking":
      return [
        input.producerCommand ? `Run ${input.producerCommand} to create ${input.path}.` : `Identify the producer command for ${input.path}, then regenerate it.`,
      ];
    case "stale_consumed_blocking":
      return [
        `Find the current producer for ${input.path}; it is consumed but no local refresh command was identified.`,
      ];
    case "no_action_required":
      return [
        `No immediate action required for ${input.path}.`,
      ];
  }
}

function classifyEntry(input: {
  path: string;
  exists: boolean;
  generatedAtUtc: string | null;
  ageHours: number | null;
  fresh: boolean;
  consumed: boolean;
  required: boolean;
}): { classification: FreshnessClassification; blocking: boolean; reason: string } {
  if (!input.exists) {
    if (isFormalExternalPath(input.path)) {
      return { classification: "external_proof_required", blocking: false, reason: "Formal runtime/provider proof is external and cannot be created by source checks." };
    }
    if (isAdminTruthSourcePath(input.path)) {
      return { classification: "admin_truth_source_required", blocking: false, reason: "Admin truth evidence requires an approved redacted source sample." };
    }
    if (isManualVisualPath(input.path)) {
      return { classification: "manual_visual_required", blocking: false, reason: "Final visual/operator QA requires a visual evidence artifact." };
    }
    return {
      classification: "missing_expected",
      blocking: input.required || input.consumed,
      reason: input.required ? "Required consumed artifact is missing." : "Expected artifact is missing.",
    };
  }

  if (isFormalExternalPath(input.path)) {
    return { classification: "external_proof_required", blocking: false, reason: "Artifact is a formal runtime/provider gate; source freshness cannot clear it." };
  }
  if (isAdminTruthSourcePath(input.path)) {
    return { classification: "admin_truth_source_required", blocking: false, reason: "Artifact is an admin truth source sample gate; generic source freshness cannot clear it." };
  }
  if (isManualVisualPath(input.path)) {
    return { classification: "manual_visual_required", blocking: false, reason: "Artifact is a final visual/operator QA gate; source freshness cannot clear it." };
  }
  if (input.fresh && input.consumed) {
    return { classification: "fresh_and_consumed", blocking: false, reason: "Generated artifact is within the doctrine freshness window and has a known consumer." };
  }
  if (input.fresh) {
    return { classification: "fresh_but_unused", blocking: false, reason: "Generated artifact is fresh but has no known direct consumer." };
  }
  if (input.consumed) {
    return {
      classification: "stale_consumed",
      blocking: input.required,
      reason: input.required ? "Required consumed artifact is stale." : "Consumed artifact is stale and must be treated as evidence only.",
    };
  }
  if ((input.ageHours ?? 0) > 168) {
    return { classification: "archive_candidate", blocking: false, reason: "Unconsumed artifact is older than seven days and should be reviewed as archive evidence." };
  }
  return { classification: "stale_harmless", blocking: false, reason: "Unconsumed stale artifact is evidence only and does not block local source work." };
}

function buildExpectedPaths(adminRegistry: Map<string, AdminDebugReportDefinition>) {
  return Array.from(new Set([
    ...listGeneratedArtifacts(),
    ...Array.from(adminRegistry.keys()),
    "agent/state/provider-smoke-evidence.generated.json",
    "agent/state/runtime-smoke-evidence.generated.json",
    "agent/state/admin-truth-sample-evidence.generated.json",
  ])).sort();
}

export function buildEvidenceFreshnessIndex() {
  const generatedAtUtc = nowIso();
  const nowMs = Date.parse(generatedAtUtc);
  const adminRegistry = parseAdminDebugRegistry();
  const packageScripts = getPackageScripts("package.json");
  const expectedPaths = buildExpectedPaths(adminRegistry);
  const consumerIndex = buildConsumerIndex(expectedPaths);

  const entries = expectedPaths.map((path): EvidenceFreshnessEntry => {
    const exists = existsSync(path);
    const generatedAtUtc = exists ? generatedAtFor(path) : null;
    const artifactAgeHours = ageHours(generatedAtUtc, nowMs);
    const freshness = deriveGeneratedReportFreshness({
      generatedAt: generatedAtUtc,
      nowMs,
      staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    });
    const adminDefinition = adminRegistry.get(path);
    const consumerPaths = Array.from(new Set([
      ...(consumerIndex.get(path) ?? []),
      ...(adminDefinition ? [ADMIN_DEBUG_REGISTRY_PATH] : []),
    ])).sort();
    const consumedBy = [
      ...(adminDefinition ? ["admin_debug_control_tower"] : []),
      ...(consumerPaths.some((consumer) => consumer.startsWith("scripts/agent/")) ? ["agent_validator"] : []),
      ...(consumerPaths.some((consumer) => consumer.startsWith("agent/index/") || consumer.startsWith("agent/context/")) ? ["agent_context"] : []),
    ];
    const required = Boolean(adminDefinition?.required);
    const classified = classifyEntry({
      path,
      exists,
      generatedAtUtc,
      ageHours: artifactAgeHours,
      fresh: freshness === "fresh",
      consumed: consumerPaths.length > 0,
      required,
    });
    const producerCommand = commandForArtifact(path, adminRegistry, packageScripts);
    const actionability = actionabilityFor({
      classification: classified.classification,
      blocking: classified.blocking,
      producerCommand,
    });

    return {
      path,
      classification: classified.classification,
      actionability,
      generatedAtUtc,
      ageHours: artifactAgeHours,
      staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
      producerCommand,
      consumerPaths: consumerPaths.slice(0, 8),
      consumedBy: Array.from(new Set(consumedBy)).sort(),
      required,
      exists,
      blocking: classified.blocking,
      truthUse: truthUseFor(classified.classification),
      reason: classified.reason,
      nextExactSteps: nextStepsFor({ path, actionability, producerCommand }),
    };
  });

  const priorityOrder: Record<FreshnessClassification, number> = {
    stale_consumed: 0,
    missing_expected: 1,
    external_proof_required: 2,
    admin_truth_source_required: 3,
    manual_visual_required: 4,
    fresh_and_consumed: 5,
    fresh_but_unused: 6,
    stale_harmless: 7,
    archive_candidate: 8,
  };
  const sortedEntries = entries.sort((left, right) =>
    priorityOrder[left.classification] - priorityOrder[right.classification]
    || Number(right.blocking) - Number(left.blocking)
    || (right.ageHours ?? -1) - (left.ageHours ?? -1)
    || left.path.localeCompare(right.path),
  );
  const byClassification = sortedEntries.reduce<Record<FreshnessClassification, number>>((counts, entry) => {
    counts[entry.classification] += 1;
    return counts;
  }, {
    fresh_and_consumed: 0,
    fresh_but_unused: 0,
    stale_harmless: 0,
    stale_consumed: 0,
    missing_expected: 0,
    manual_visual_required: 0,
    admin_truth_source_required: 0,
    external_proof_required: 0,
    archive_candidate: 0,
  });
  const blockingEntries = sortedEntries.filter((entry) => entry.blocking);
  const archiveCandidates = sortedEntries.filter((entry) => entry.classification === "archive_candidate").slice(0, MAX_ARCHIVE_CANDIDATES);
  const externalProofRequired = sortedEntries.filter((entry) => entry.classification === "external_proof_required").slice(0, 40);
  const manualVisualRequired = sortedEntries.filter((entry) => entry.classification === "manual_visual_required").slice(0, 40);
  const adminTruthSourceRequired = sortedEntries.filter((entry) => entry.classification === "admin_truth_source_required").slice(0, 40);

  const byActionability = sortedEntries.reduce<Record<EvidenceFreshnessActionability, number>>((counts, entry) => {
    counts[entry.actionability] += 1;
    return counts;
  }, {
    refreshable_by_existing_local_validator: 0,
    external_proof_required: 0,
    manual_visual_required: 0,
    admin_truth_source_required: 0,
    archive_evidence_only: 0,
    stale_consumed_blocking: 0,
    missing_expected_blocking: 0,
    no_action_required: 0,
  });

  return {
    reportKey: "evidence-freshness-index",
    generatedAtUtc,
    doctrine: {
      generatedReportsAreTruth: false,
      defaultStaleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
      staleTruthUse: "evidence_snapshot_only",
      formalProofNote: "Runtime/provider and final visual proof gates cannot be cleared by source-only freshness; admin truth requires an approved source sample.",
    },
    summary: {
      artifactCount: sortedEntries.length,
      indexedArtifactCount: Math.min(sortedEntries.length, MAX_INDEX_ROWS),
      omittedArtifactCount: Math.max(0, sortedEntries.length - MAX_INDEX_ROWS),
      blockingCount: blockingEntries.length,
      staleConsumedCount: byClassification.stale_consumed,
      missingExpectedCount: byClassification.missing_expected,
      externalProofRequiredCount: byClassification.external_proof_required,
      manualVisualRequiredCount: byClassification.manual_visual_required,
      adminTruthSourceRequiredCount: byClassification.admin_truth_source_required,
      archiveCandidateCount: byClassification.archive_candidate,
      byClassification,
      byActionability,
    },
    blockingArtifacts: blockingEntries.slice(0, 40),
    externalProofRequired,
    manualVisualRequired,
    adminTruthSourceRequired,
    archiveCandidates,
    artifacts: sortedEntries.slice(0, MAX_INDEX_ROWS),
  };
}

function validateIndex(report: ReturnType<typeof buildEvidenceFreshnessIndex>) {
  const failures: string[] = [];
  const packageScripts = getPackageScripts("package.json");
  if (packageScripts["check:evidence-freshness-index"] !== "tsx scripts/agent/validate-evidence-freshness-index.ts") {
    failures.push("package.json must expose check:evidence-freshness-index.");
  }
  if (report.doctrine.generatedReportsAreTruth !== false) {
    failures.push("Generated reports must not be marked as app truth.");
  }
  for (const artifact of report.artifacts) {
    if ((artifact.classification === "stale_harmless" || artifact.classification === "stale_consumed" || artifact.classification === "archive_candidate") && artifact.truthUse === "current_truth_when_fresh") {
      failures.push(`${artifact.path} is stale but marked as current truth.`);
    }
    if ((artifact.classification === "external_proof_required" || artifact.classification === "manual_visual_required") && artifact.truthUse !== "formal_proof_gate") {
      failures.push(`${artifact.path} proof gate is not labeled formal_proof_gate.`);
    }
    if (artifact.classification === "admin_truth_source_required" && artifact.truthUse !== "evidence_snapshot_only") {
      failures.push(`${artifact.path} admin truth source sample is not labeled evidence_snapshot_only.`);
    }
  }
  for (const artifact of report.blockingArtifacts) {
    if (artifact.classification !== "stale_consumed" && artifact.classification !== "missing_expected") {
      failures.push(`${artifact.path} is blocking with invalid classification ${artifact.classification}.`);
      continue;
    }
    failures.push(`${artifact.path} is blocking because it is ${artifact.classification}; actionability=${artifact.actionability}; next=${artifact.nextExactSteps[0] ?? "review required"}`);
  }
  return failures;
}

function renderMarkdown(report: ReturnType<typeof buildEvidenceFreshnessIndex>) {
  const lines = [
    "# Evidence Freshness Index",
    "",
    `Generated: ${report.generatedAtUtc}`,
    "",
    "Generated reports are evidence snapshots only. Stale, missing, runtime, provider, or admin-truth evidence cannot be treated as current app truth by this source-only lane.",
    "",
    "## Summary",
    "",
    `- Artifacts scanned: ${report.summary.artifactCount}`,
    `- Indexed artifacts: ${report.summary.indexedArtifactCount}`,
    `- Omitted artifacts: ${report.summary.omittedArtifactCount}`,
    `- Blocking artifacts: ${report.summary.blockingCount}`,
    `- Stale consumed artifacts: ${report.summary.staleConsumedCount}`,
    `- External proof required: ${report.summary.externalProofRequiredCount}`,
    `- Manual visual/operator QA required: ${report.summary.manualVisualRequiredCount}`,
    `- Admin truth source required: ${report.summary.adminTruthSourceRequiredCount}`,
    "",
    "## Actionability",
    "",
    ...Object.entries(report.summary.byActionability).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Blocking Artifacts",
    "",
    ...(report.blockingArtifacts.length > 0
      ? report.blockingArtifacts.slice(0, 40).map((artifact) => `- ${artifact.path}: ${artifact.actionability}; ${artifact.nextExactSteps[0] ?? artifact.reason}`)
      : ["- None"]),
    "",
    "## Formal Evidence Gates",
    "",
    ...report.externalProofRequired.slice(0, 20).map((artifact) => `- ${artifact.path}: external proof required; source checks cannot clear this gate.`),
    ...report.manualVisualRequired.slice(0, 20).map((artifact) => `- ${artifact.path}: final visual/operator QA required; source checks cannot clear this gate.`),
    ...report.adminTruthSourceRequired.slice(0, 20).map((artifact) => `- ${artifact.path}: admin truth source sample required; use redacted approved evidence only.`),
    "",
  ];
  return lines.join("\n");
}

function main() {
  const report = buildEvidenceFreshnessIndex();
  ensureDirectory(dirname(REPORT_PATH));
  writeJsonFile(REPORT_PATH, report as unknown as Json);
  writeTextFile(DOC_PATH, renderMarkdown(report));

  const failures = validateIndex(report);
  if (failures.length > 0) {
    console.error("Evidence freshness index validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Evidence freshness index: artifacts=${report.summary.artifactCount}, blocking=${report.summary.blockingCount}, staleConsumed=${report.summary.staleConsumedCount}, missingExpected=${report.summary.missingExpectedCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
