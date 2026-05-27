import { listFiles, readText, type ValidationResult } from "./config-hardening-shared";

export type CiWorkflowEntry = {
  file: string;
  trigger: string;
  command: string[];
  environment: string;
  secretsUsed: string[];
  deploymentRisk: "none" | "manual_only" | "deploy_capable";
  providerCallRisk: "none" | "read_only" | "provider_capable";
  artifactOutputs: string[];
  requiredStatusBeforeBetaExit: boolean;
  classification: "source_validation" | "manual_cloud_readiness" | "dependency_window" | "release_notes_fallback" | "report_only";
};

export type CiReleaseDisciplineReport = {
  generatedAtUtc: string;
  workflows: CiWorkflowEntry[];
  releaseNotesFreshnessOwner: string;
  openPrHygieneOwner: string;
  betaExitFreshnessOwner: string;
  providerCommandsSeparated: boolean;
  accidentalDeployRisks: string[];
  staleReleaseRisks: string[];
  remainingGaps: string[];
};

function commandsFrom(text: string) {
  return text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("run:"))
    .map((line) => line.replace(/^run:\s*/u, ""));
}

function workflowFor(file: string): CiWorkflowEntry {
  const text = readText(file);
  const lower = text.toLowerCase();
  const classification = file.includes("cloud-readiness")
    ? "manual_cloud_readiness"
    : file.includes("dependency")
      ? "dependency_window"
      : file.includes("release-notes")
        ? "release_notes_fallback"
        : file.includes("scorecard")
          ? "report_only"
          : "source_validation";
  return {
    file,
    trigger: text.includes("workflow_dispatch") && !text.match(/\non:\s*\[\s*push/u) ? "workflow_dispatch" : "mixed",
    command: commandsFrom(text),
    environment: file.includes("cloud-readiness") ? "manual_cloud_readiness" : "github_actions_manual_fallback",
    secretsUsed: [...text.matchAll(/\$\{\{\s*(?:secrets|vars)\.([A-Z0-9_]+)/gu)].map((match) => match[1]).sort(),
    deploymentRisk: /(firebase deploy|gcloud .* deploy|vercel --prod)/iu.test(text) ? "deploy_capable" : "manual_only",
    providerCallRisk: /(gcloud|bq\s|google-github-actions\/auth)/iu.test(text) ? "read_only" : "none",
    artifactOutputs: [...text.matchAll(/path:\s*([A-Za-z0-9_.\/-]+)/gu)].map((match) => match[1]),
    requiredStatusBeforeBetaExit: /check:release-notes|typecheck|check:beta-score|current-beta/u.test(text),
    classification,
  };
}

export function buildCiReleaseDisciplineReport(options: { generatedAtUtc?: string } = {}): CiReleaseDisciplineReport {
  const workflows = listFiles([".github/workflows"], [".yml", ".yaml"]).map(workflowFor);
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    workflows,
    releaseNotesFreshnessOwner: "check:release-notes",
    openPrHygieneOwner: "check:open-pr-dependency-hygiene",
    betaExitFreshnessOwner: "check:current-beta-exit-status",
    providerCommandsSeparated: workflows.every((workflow) => workflow.providerCallRisk === "none" || workflow.classification === "manual_cloud_readiness"),
    accidentalDeployRisks: workflows.filter((workflow) => workflow.deploymentRisk === "deploy_capable").map((workflow) => workflow.file),
    staleReleaseRisks: [],
    remainingGaps: ["GitHub workflows are manual fallback or release-note fallback; Cloud Build/provider state remains external evidence."],
  };
}

export function validateCiReleaseDisciplineReport(report: CiReleaseDisciplineReport): ValidationResult {
  const failures: string[] = [];
  if (report.workflows.some((workflow) => !workflow.classification)) failures.push("CI/deploy workflow unclassified");
  if (report.accidentalDeployRisks.length > 0) failures.push("release command can deploy accidentally");
  if (!report.providerCommandsSeparated) failures.push("provider-call command in source validation loop");
  if (report.releaseNotesFreshnessOwner !== "check:release-notes") failures.push("release notes can be stale while release passes");
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
