import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRefreshPlan,
  staleArtifactsFromPlan,
  uniqueRefreshCommands,
  type ArtifactRefreshStatus,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import { readGeneratedArtifactGitContext } from "../../src/lib/agent-score/generated-artifact-version-policy";

export const REFRESH_SAFEGUARDS_REPORT_PATH = "agent/state/refresh-safeguards.generated.json";
export const REFRESH_SAFEGUARDS_DOC_PATH = "docs/agent-truth/refresh-safeguards.md";

type RefreshSafeguardsReportInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  nowUtc?: string;
  artifacts?: RefreshArtifactInput[];
};

export type RefreshSafeguardsReport = {
  generatedAtUtc: string;
  reportKey: "refresh-safeguards";
  currentHead: string;
  summary: {
    refreshRegistryReady: boolean;
    refreshPlanReady: boolean;
    requiredArtifactsCovered: boolean;
    staleArtifactsHaveActions: boolean;
    plainMessagesReady: boolean;
    betaReportsCurrent: boolean;
    formalEvidenceGateClearedFromStaleArtifact: boolean;
    betaExitMarkedReady: false;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  refreshRegistry: Array<{
    reportKey: string;
    artifactPath: string;
    refreshCommand: string;
    owner: string;
  }>;
  refreshPlan: ArtifactRefreshStatus[];
  staleArtifacts: ReturnType<typeof staleArtifactsFromPlan>;
  exactRefreshCommands: string[];
  fixesApplied: string[];
  nextExactSteps: string[];
};

function readGitHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readJsonRecord(root: string, artifactPath: string): Record<string, unknown> | null {
  const fullPath = join(root, artifactPath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function buildArtifactInputsFromWorkspace(root: string, currentHead: string): RefreshArtifactInput[] {
  return REFRESH_ARTIFACT_REGISTRY.map((entry) => {
    const parsed = readJsonRecord(root, entry.artifactPath);
    if (!parsed) {
      return {
        artifactPath: entry.artifactPath,
        currentCodeVersion: currentHead,
        exists: false,
      };
    }
    const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
    const gitContext = artifactHead
      ? readGeneratedArtifactGitContext(root, artifactHead, entry.artifactPath)
      : null;
    return {
      artifactPath: entry.artifactPath,
      generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
      sourceCommit: artifactHead,
      currentHead: readString(parsed.currentHead),
      currentCodeVersion: currentHead,
      parentHead: gitContext?.parentHead,
      changedFilesInHead: gitContext?.changedFilesInHead,
      changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
      exists: true,
    };
  });
}

export function buildRefreshSafeguardsReport(input: RefreshSafeguardsReportInput = {}): RefreshSafeguardsReport {
  const root = process.cwd();
  const currentHead = input.currentHead ?? readGitHead(root);
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const artifacts = input.artifacts ?? buildArtifactInputsFromWorkspace(root, currentHead);
  const refreshPlan = buildRefreshPlan(artifacts, {
    currentCodeVersion: currentHead,
    nowUtc: input.nowUtc ?? generatedAtUtc,
  });
  const staleArtifacts = staleArtifactsFromPlan(refreshPlan);
  const exactRefreshCommands = uniqueRefreshCommands(refreshPlan);
  const betaReportsCurrent = refreshPlan
    .filter((entry) => entry.owner === "beta")
    .every((entry) => !entry.needsRefresh);
  const staleArtifactsHaveActions = staleArtifacts.every((entry) =>
    typeof entry.refreshCommand === "string"
    && entry.refreshCommand.length > 0
    && typeof entry.nextAction === "string"
    && entry.nextAction.length > 0);
  const plainMessagesReady = refreshPlan.every((entry) =>
    !/\bHEAD\b|currentHead/u.test(`${entry.message}\n${entry.nextAction}`));
  const requiredArtifactsCovered = REFRESH_ARTIFACT_REGISTRY.every((entry) =>
    exactRefreshCommands.includes(entry.refreshCommand));
  const p0Count = [
    !requiredArtifactsCovered,
    !staleArtifactsHaveActions,
    !plainMessagesReady,
  ].filter(Boolean).length;
  const p1Count = [
    !betaReportsCurrent,
    staleArtifacts.some((entry) => entry.status === "unregistered"),
  ].filter(Boolean).length;

  return {
    generatedAtUtc,
    reportKey: "refresh-safeguards",
    currentHead,
    summary: {
      refreshRegistryReady: REFRESH_ARTIFACT_REGISTRY.length > 0,
      refreshPlanReady: refreshPlan.length > 0,
      requiredArtifactsCovered,
      staleArtifactsHaveActions,
      plainMessagesReady,
      betaReportsCurrent,
      formalEvidenceGateClearedFromStaleArtifact: false,
      betaExitMarkedReady: false,
      p0Count,
      p1Count,
      p2Count: staleArtifacts.length,
    },
    refreshRegistry: REFRESH_ARTIFACT_REGISTRY.map((entry) => ({
      reportKey: entry.reportKey,
      artifactPath: entry.artifactPath,
      refreshCommand: entry.refreshCommand,
      owner: entry.owner,
    })),
    refreshPlan,
    staleArtifacts,
    exactRefreshCommands,
    fixesApplied: [
      "Added a central refresh command registry for generated beta, evidence, telemetry, mobile, and creator reports.",
      "Added plain refresh messages for stale source, stale age, missing, and unregistered artifacts.",
      "Kept formal evidence gates blocked when evidence is stale.",
    ],
    nextExactSteps: staleArtifacts.length > 0
      ? exactRefreshCommands
      : ["Keep running npm run check:refresh-safeguards before relying on generated beta evidence."],
  };
}

export function validateRefreshSafeguardsReport(report: RefreshSafeguardsReport, currentHead = report.currentHead) {
  const failures: string[] = [];
  if (report.currentHead !== currentHead) {
    failures.push("refresh safeguards report must be generated from the current code version.");
  }
  if (!report.summary.refreshRegistryReady) {
    failures.push("refresh registry must be ready.");
  }
  if (!Array.isArray(report.refreshPlan) || report.refreshPlan.length === 0) {
    failures.push("refreshPlan must exist.");
  }
  for (const entry of REFRESH_ARTIFACT_REGISTRY) {
    if (!report.refreshRegistry.some((registered) => registered.artifactPath === entry.artifactPath && registered.refreshCommand === entry.refreshCommand)) {
      failures.push(`${entry.artifactPath} must have a refresh command.`);
    }
  }
  for (const stale of report.staleArtifacts) {
    if (!stale.refreshCommand || !stale.nextAction) {
      failures.push(`${stale.artifactPath} is stale without a next action.`);
    }
  }
  const userFacingMessages = report.refreshPlan
    .map((entry) => `${entry.message}\n${entry.nextAction}`)
    .join("\n");
  if (/\bHEAD\b|currentHead/u.test(userFacingMessages)) {
    failures.push("User-facing refresh messages must not use raw source-control jargon.");
  }
  if (report.summary.formalEvidenceGateClearedFromStaleArtifact) {
    failures.push("Formal evidence gates cannot clear from stale artifacts.");
  }
  if (report.summary.betaExitMarkedReady) {
    failures.push("Refresh safeguards must not mark beta exit ready.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) {
    failures.push("nextExactSteps must be present.");
  }
  return failures;
}

function renderDoc(report: RefreshSafeguardsReport) {
  const staleRows = report.staleArtifacts.length > 0
    ? report.staleArtifacts
      .map((entry) => `- ${entry.artifactPath}: ${entry.message} Command: \`${entry.refreshCommand ?? "register a refresh command"}\``)
      .join("\n")
    : "- No stale registered artifacts were found in this run.";
  const commandRows = report.exactRefreshCommands.map((command) => `- \`${command}\``).join("\n");

  return `# Refresh Safeguards

Generated: ${report.generatedAtUtc}

## Summary

Generated beta, evidence, telemetry, mobile, and creator reports now have an exact refresh command registry. Stale reports must say what to run next and must not clear formal evidence gates.

## Stale Artifacts

${staleRows}

## Refresh Commands

${commandRows}

## Rules

- Refresh this report from the latest code version when the source version or freshness window does not match.
- Do not treat stale evidence as formal proof.
- Do not mark beta exit ready from generated artifacts alone.
- Keep operator-facing freshness messages plain and actionable.
`;
}

function writeReport(root: string, report: RefreshSafeguardsReport) {
  const reportPath = join(root, REFRESH_SAFEGUARDS_REPORT_PATH);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const docPath = join(root, REFRESH_SAFEGUARDS_DOC_PATH);
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, renderDoc(report));
}

function main() {
  const root = process.cwd();
  const currentHead = readGitHead(root);
  const report = buildRefreshSafeguardsReport({ currentHead });
  const failures = validateRefreshSafeguardsReport(report, currentHead);
  writeReport(root, report);
  const docs = readFileSync(join(root, REFRESH_SAFEGUARDS_DOC_PATH), "utf8");
  if (/\bHEAD\b|currentHead/u.test(docs)) {
    failures.push("Refresh safeguards docs must not expose raw source-control jargon.");
  }
  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(`Refresh safeguards validator passed (${report.staleArtifacts.length} stale artifacts need action).`);
}

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (invokedPath) {
  main();
}
