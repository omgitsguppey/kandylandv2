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

export type ExternalCheckProviderEntry = {
  provider: "firebase_app_hosting" | "google_cloud_build" | "graphite";
  githubCheckName: string;
  authority: "deployment_rollout" | "source_validation_trigger" | "stacked_pr_tooling";
  sourceOwnedConfig: string[];
  sourceValidationOwner: string;
  releaseGateClassification: "external_evidence_required" | "not_authoritative_for_source_release";
  canBeClearedBySourceChecks: boolean;
  requiredBeforeBetaExit: boolean;
  nextExactAction: string;
};

export type CiReleaseDisciplineReport = {
  generatedAtUtc: string;
  workflows: CiWorkflowEntry[];
  externalCheckProviders: ExternalCheckProviderEntry[];
  releaseNotesFreshnessOwner: string;
  openPrHygieneOwner: string;
  betaExitFreshnessOwner: string;
  providerCommandsSeparated: boolean;
  externalCheckProviderBoundaries: boolean;
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

const EXTERNAL_CHECK_PROVIDERS: ExternalCheckProviderEntry[] = [
  {
    provider: "firebase_app_hosting",
    githubCheckName: "Firebase App Hosting",
    authority: "deployment_rollout",
    sourceOwnedConfig: ["apphosting.yaml", "firebase.json", ".firebaserc", "backends.json"],
    sourceValidationOwner: "check:environment-deployment-truth",
    releaseGateClassification: "external_evidence_required",
    canBeClearedBySourceChecks: false,
    requiredBeforeBetaExit: true,
    nextExactAction: "Reauthorize or restart the Firebase App Hosting rollout in Firebase/GCP, then attach the fresh rollout check result for the current commit.",
  },
  {
    provider: "google_cloud_build",
    githubCheckName: "Google Cloud Build",
    authority: "source_validation_trigger",
    sourceOwnedConfig: ["cloudbuild.yaml", "cloudbuild.release-notes.yaml"],
    sourceValidationOwner: "check:ci-release-discipline",
    releaseGateClassification: "external_evidence_required",
    canBeClearedBySourceChecks: false,
    requiredBeforeBetaExit: true,
    nextExactAction: "Repair or reauthorize the Cloud Build GitHub trigger/connection externally; source checks only prove the YAML lane is valid.",
  },
  {
    provider: "graphite",
    githubCheckName: "Graphite App",
    authority: "stacked_pr_tooling",
    sourceOwnedConfig: [],
    sourceValidationOwner: "external GitHub branch protection / Graphite app settings",
    releaseGateClassification: "not_authoritative_for_source_release",
    canBeClearedBySourceChecks: false,
    requiredBeforeBetaExit: false,
    nextExactAction: "If Graphite is still required on main, fix the Graphite app externally; otherwise remove it from required branch checks because it is not a repo source truth gate.",
  },
];

export function buildCiReleaseDisciplineReport(options: { generatedAtUtc?: string } = {}): CiReleaseDisciplineReport {
  const workflows = listFiles([".github/workflows"], [".yml", ".yaml"]).map(workflowFor);
  const externalCheckProviders = EXTERNAL_CHECK_PROVIDERS;
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    workflows,
    externalCheckProviders,
    releaseNotesFreshnessOwner: "check:release-notes",
    openPrHygieneOwner: "check:open-pr-dependency-hygiene",
    betaExitFreshnessOwner: "check:current-beta-exit-status",
    providerCommandsSeparated: workflows.every((workflow) => workflow.providerCallRisk === "none" || workflow.classification === "manual_cloud_readiness"),
    externalCheckProviderBoundaries: externalCheckProviders.every((provider) => !provider.canBeClearedBySourceChecks && provider.nextExactAction.length > 0),
    accidentalDeployRisks: workflows.filter((workflow) => workflow.deploymentRisk === "deploy_capable").map((workflow) => workflow.file),
    staleReleaseRisks: [],
    remainingGaps: [
      "GitHub workflows are manual fallback or release-note fallback; Cloud Build/provider state remains external evidence.",
      "Firebase App Hosting rollout, Google Cloud Build trigger health, and Graphite app checks cannot be cleared by source-only validators.",
    ],
  };
}

export function validateCiReleaseDisciplineReport(report: CiReleaseDisciplineReport): ValidationResult {
  const failures: string[] = [];
  if (report.workflows.some((workflow) => !workflow.classification)) failures.push("CI/deploy workflow unclassified");
  if (report.accidentalDeployRisks.length > 0) failures.push("release command can deploy accidentally");
  if (!report.providerCommandsSeparated) failures.push("provider-call command in source validation loop");
  if (!report.externalCheckProviderBoundaries) failures.push("external check providers can be mistaken for source-owned gates");
  if (report.releaseNotesFreshnessOwner !== "check:release-notes") failures.push("release notes can be stale while release passes");
  for (const provider of report.externalCheckProviders) {
    if (provider.canBeClearedBySourceChecks) failures.push(`${provider.githubCheckName} incorrectly clears from source checks`);
    if (!provider.nextExactAction) failures.push(`${provider.githubCheckName} missing next action`);
    if (provider.provider === "graphite" && provider.requiredBeforeBetaExit) failures.push("Graphite cannot be a required beta-exit source gate");
  }
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
