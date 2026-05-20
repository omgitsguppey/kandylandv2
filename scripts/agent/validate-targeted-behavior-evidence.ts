import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type TargetedBehaviorStatus = "passed" | "partial" | "failed";
export type TargetedBehaviorValidatorStatus = "pass" | "fail" | "unavailable";

export type TargetedBehaviorValidatorResult = {
  id: string;
  command: string;
  status: TargetedBehaviorValidatorStatus;
  artifactPath: string;
  currentHead?: string;
  surfaces: string[];
  proves: string;
  doesNotProve: string;
  blocker?: string;
};

export type TargetedBehaviorEvidenceReport = {
  generatedAtUtc: string;
  reportKey: "targeted-behavior-evidence";
  status: TargetedBehaviorStatus;
  overallStatus: TargetedBehaviorStatus;
  passed: boolean;
  sourceCommit: string;
  latestCodeVersion: string;
  currentHead: string;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  bigQueryCallsPerformed: false;
  visualQaPerformed: false;
  realDeviceSmokePerformed: false;
  detail: string;
  summary: string;
  validatorResults: TargetedBehaviorValidatorResult[];
  commands: Array<{
    command: string;
    status: TargetedBehaviorValidatorStatus;
    proves: string;
    doesNotProve: string;
  }>;
  surfacesCovered: string[];
  notCovered: string[];
  formalEvidenceImpact: "source_behavior_only" | string;
  doesNotClear: string[];
  evidence: string[];
  readinessImpact: {
    targetedBehaviorGatePassed: boolean;
    notes: string[];
  };
};

export type BuildTargetedBehaviorEvidenceInputs = {
  generatedAtUtc: string;
  latestCodeVersion: string;
  validatorResults: TargetedBehaviorValidatorResult[];
  notCovered: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const DOC_PATH = "docs/agent-truth/targeted-behavior-evidence.md";

const DOES_NOT_PROVE = "Does not prove manual_screenshot, provider_smoke, runtime_smoke, admin_truth_sample, visual/manual QA, provider smoke, runtime smoke, real-device smoke, or production admin truth samples.";
const DOES_NOT_CLEAR = ["manual_screenshot", "provider_smoke", "runtime_smoke", "admin_truth_sample"];

const TARGETED_VALIDATORS = [
  {
    id: "creator-settings-control-plane",
    command: "npm run check:creator-settings-control-plane",
    artifactPath: "agent/state/creator-settings-control-plane.generated.json",
    surfaces: ["creator_settings", "creator_profile", "fan_pass"],
    proves: "Creator Settings controls, setup checklist, creator-safe validation, and user-facing settings impact are source-validated.",
  },
  {
    id: "creator-pricing-wiring",
    command: "npm run check:creator-pricing-wiring",
    artifactPath: "agent/state/creator-pricing-wiring.generated.json",
    surfaces: ["creator_pricing", "fan_pass", "creator_experiences"],
    proves: "Creator Fan Pass and experience pricing wiring is source-validated without changing GumDrop math.",
  },
  {
    id: "creator-broadcast-timeline-prep",
    command: "npm run check:creator-broadcast-timeline-prep",
    artifactPath: "agent/state/creator-broadcast-timeline-prep.generated.json",
    surfaces: ["creator_broadcasts", "notifications", "creator_timeline"],
    proves: "Creator broadcast notification and timeline contracts are source-validated.",
  },
  {
    id: "creator-profile-mobile-timeline",
    command: "npm run check:creator-profile-mobile-timeline",
    artifactPath: "agent/state/creator-profile-mobile-timeline.generated.json",
    surfaces: ["creator_profile", "mobile_ui", "timeline"],
    proves: "Creator profile mobile header and timeline source constraints are source-validated.",
  },
  {
    id: "global-marquee-truncated-titles",
    command: "npm run check:global-marquee-truncated-titles",
    artifactPath: "agent/state/global-marquee-truncated-titles.generated.json",
    surfaces: ["ui_titles", "creator_ui", "admin_ui", "user_library"],
    proves: "Shared marquee behavior for truncated titles is source-validated with reduced-motion separation.",
  },
  {
    id: "creator-drop-status-metrics",
    command: "npm run check:creator-drop-status-metrics",
    artifactPath: "agent/state/creator-drop-status-metrics.generated.json",
    surfaces: ["creator_drop_manager", "drop_metrics", "drop_status"],
    proves: "Creator drop status and metrics display contracts are source-validated without fake metrics.",
  },
  {
    id: "user-loading-wallet-mobile-refinement",
    command: "npm run check:user-loading-wallet-mobile-refinement",
    artifactPath: "agent/state/user-loading-wallet-mobile-refinement.generated.json",
    surfaces: ["user_dashboard", "wallet_ui", "mobile_loading"],
    proves: "User dashboard loading and wallet mobile density are source-validated without payment runtime changes.",
  },
  {
    id: "existing-algorithm-refinement",
    command: "npm run check:existing-algorithm-refinement",
    artifactPath: "agent/state/existing-algorithm-refinement.generated.json",
    surfaces: ["beta_scoring", "telemetry", "creator_pricing", "drop_status", "mobile_density"],
    proves: "Existing scoring, telemetry, pricing, drop, marquee, and loading algorithms are source-validated.",
  },
  {
    id: "overnight-wiring-integrity",
    command: "npm run check:overnight-wiring-integrity",
    artifactPath: "agent/state/overnight-wiring-integrity.generated.json",
    surfaces: ["creator_settings", "telemetry", "parity", "routes"],
    proves: "Recent creator, UI, telemetry, and parity wiring is source-validated.",
  },
  {
    id: "final-telemetry-closure-lock",
    command: "npm run check:final-telemetry-closure-lock",
    artifactPath: "agent/state/final-telemetry-closure-lock.generated.json",
    surfaces: ["telemetry", "firestore", "bigquery", "ga4", "admin_evidence"],
    proves: "Telemetry dependency closure status is source-validated without runtime provider calls.",
  },
  {
    id: "mobile-ui-final-lock",
    command: "npm run check:mobile-ui-final-lock",
    artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
    surfaces: ["mobile_ui", "admin_ui", "creator_ui", "user_ui"],
    proves: "Mobile UI doctrine, scale, skeleton, and self-check guards are source-validated.",
  },
  {
    id: "user-creator-ui-parity",
    command: "npm run check:user-creator-ui-parity",
    artifactPath: "agent/state/user-creator-ui-parity.generated.json",
    surfaces: ["user_ui", "creator_ui", "route_parity"],
    proves: "User and creator surface parity is source-validated.",
  },
  {
    id: "source-truth-authority-map",
    command: "npm run check:source-truth-authority-map",
    artifactPath: "agent/state/source-truth-authority-map.generated.json",
    surfaces: ["source_truth", "admin_truth", "beta_evidence"],
    proves: "Source truth authority map is source-validated.",
  },
  {
    id: "gumdrop-economy-accuracy",
    command: "npm run check:gumdrop-economy-accuracy",
    artifactPath: "agent/state/gumdrop-economy-accuracy.generated.json",
    surfaces: ["gumdrop_economy", "source_of_funds", "creator_monetization"],
    proves: "GumDrop source-of-funds and creator monetization source contracts are source-validated.",
  },
  {
    id: "creator-drop-management-approval",
    command: "npm run check:creator-drop-management-approval",
    artifactPath: "agent/state/creator-drop-management-approval.generated.json",
    surfaces: ["creator_drop_manager", "admin_approval", "drop_lifecycle"],
    proves: "Creator drop submission and admin approval boundaries are source-validated.",
  },
  {
    id: "creator-drop-manager-mobile-refinement",
    command: "npm run check:creator-drop-manager-mobile-refinement",
    artifactPath: "agent/state/creator-drop-manager-mobile-refinement.generated.json",
    surfaces: ["creator_drop_manager", "mobile_ui"],
    proves: "Creator drop manager mobile refinement is source-validated.",
  },
] as const;

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
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

function hasPackageScript(command: string) {
  const script = command.replace(/^npm run /u, "");
  const packageJson = readJson("package.json");
  const scripts = packageJson?.scripts;
  return Boolean(scripts && typeof scripts === "object" && script in scripts);
}

function readReportHead(report: Record<string, unknown> | null) {
  const head = report?.currentHead ?? report?.sourceCommit ?? report?.latestCodeVersion;
  return typeof head === "string" ? head : undefined;
}

function validatorResultsForHead(head: string): TargetedBehaviorValidatorResult[] {
  return TARGETED_VALIDATORS.map((validator) => {
    const report = readJson(validator.artifactPath);
    const reportHead = readReportHead(report);
    let status: TargetedBehaviorValidatorStatus = "pass";
    let blocker: string | undefined;
    if (!hasPackageScript(validator.command)) {
      status = "unavailable";
      blocker = `${validator.command} is not defined in package.json.`;
    } else if (!report) {
      status = "unavailable";
      blocker = `${validator.artifactPath} is missing.`;
    } else if (reportHead !== head) {
      status = "fail";
      blocker = `${validator.artifactPath} was not generated from the latest code version.`;
    }
    return {
      id: validator.id,
      command: validator.command,
      status,
      artifactPath: validator.artifactPath,
      currentHead: reportHead,
      surfaces: [...validator.surfaces],
      proves: validator.proves,
      doesNotProve: DOES_NOT_PROVE,
      blocker,
    };
  });
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

export function buildTargetedBehaviorEvidenceReport(
  inputs: BuildTargetedBehaviorEvidenceInputs,
): TargetedBehaviorEvidenceReport {
  const failed = inputs.validatorResults.filter((result) => result.status === "fail");
  const unavailable = inputs.validatorResults.filter((result) => result.status === "unavailable");
  const status: TargetedBehaviorStatus = failed.length > 0 ? "failed" : unavailable.length > 0 ? "partial" : "passed";
  const passed = status === "passed";
  const surfacesCovered = uniqueSorted(inputs.validatorResults.flatMap((result) => result.surfaces));
  const evidence = [
    `validatorCount=${inputs.validatorResults.length}`,
    `passedValidators=${inputs.validatorResults.filter((result) => result.status === "pass").length}`,
    `failedValidators=${failed.length}`,
    `unavailableValidators=${unavailable.length}`,
    `surfacesCovered=${surfacesCovered.join(",")}`,
    `formalEvidenceImpact=source_behavior_only`,
  ];
  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "targeted-behavior-evidence",
    status,
    overallStatus: status,
    passed,
    sourceCommit: inputs.latestCodeVersion,
    latestCodeVersion: inputs.latestCodeVersion,
    currentHead: inputs.latestCodeVersion,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    bigQueryCallsPerformed: false,
    visualQaPerformed: false,
    realDeviceSmokePerformed: false,
    detail: passed
      ? "Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove manual screenshot, provider smoke, runtime smoke, or admin truth sample evidence."
      : "Current implemented source behavior validators are incomplete. This remains targeted behavior evidence only and does not prove manual screenshot, provider smoke, runtime smoke, or admin truth sample evidence.",
    summary: passed
      ? "Targeted behavior evidence was rebuilt from current creator, user, mobile, telemetry, economy, drop, and source-truth validators."
      : "Targeted behavior evidence was rebuilt with blocked or unavailable validator lanes recorded.",
    validatorResults: inputs.validatorResults,
    commands: inputs.validatorResults.map((result) => ({
      command: result.command,
      status: result.status,
      proves: result.proves,
      doesNotProve: result.doesNotProve,
    })),
    surfacesCovered,
    notCovered: inputs.notCovered,
    formalEvidenceImpact: "source_behavior_only",
    doesNotClear: DOES_NOT_CLEAR,
    evidence,
    readinessImpact: {
      targetedBehaviorGatePassed: passed,
      notes: [
        "This artifact is source-backed targeted behavior evidence only.",
        "It cannot replace manual screenshot evidence, provider smoke, runtime smoke, or production admin truth samples.",
        "Beta exit readiness must stay false until formal evidence lanes are attached.",
      ],
    },
  };
}

export function validateTargetedBehaviorEvidenceReport(report: TargetedBehaviorEvidenceReport) {
  const failures: string[] = [];
  if (report.reportKey !== "targeted-behavior-evidence") failures.push("reportKey must be targeted-behavior-evidence.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.latestCodeVersion || report.sourceCommit !== report.latestCodeVersion || report.currentHead !== report.latestCodeVersion) {
    failures.push("targeted behavior evidence must be generated from the latest code version.");
  }
  if (!["passed", "partial", "failed"].includes(report.status)) failures.push("status must be passed, partial, or failed.");
  if (report.passed !== (report.status === "passed")) failures.push("passed must match status=passed.");
  if (!Array.isArray(report.validatorResults) || report.validatorResults.length === 0) failures.push("validator results are missing.");
  if (report.status === "passed" && report.validatorResults.some((result) => result.status !== "pass")) {
    failures.push("failed validator is hidden by passed status.");
  }
  if (report.formalEvidenceImpact !== "source_behavior_only") failures.push("targeted behavior evidence must remain source_behavior_only.");
  for (const gate of DOES_NOT_CLEAR) {
    if (!report.doesNotClear.includes(gate)) failures.push(`doesNotClear must include ${gate}.`);
  }
  if (report.doesNotClear.some((gate) => /runtime_smoke|provider_smoke|manual_screenshot|admin_truth_sample/u.test(gate) === false)) {
    failures.push("doesNotClear contains an unexpected formal evidence lane.");
  }
  if (!Array.isArray(report.surfacesCovered) || report.surfacesCovered.length === 0) failures.push("surface coverage list is missing.");
  for (const result of report.validatorResults) {
    if (!["pass", "fail", "unavailable"].includes(result.status)) failures.push(`${result.id} has invalid validator status.`);
    if (!result.command || !result.proves || !result.doesNotProve) failures.push(`${result.id} must include command, proves, and doesNotProve.`);
    for (const gate of DOES_NOT_CLEAR) {
      if (!result.doesNotProve.includes(gate)) failures.push(`${result.id} doesNotProve must include ${gate}.`);
    }
    if (result.status !== "pass" && !result.blocker) failures.push(`${result.id} failed/unavailable validator must record blocker.`);
  }
  return failures;
}

function renderDoc(report: TargetedBehaviorEvidenceReport) {
  const rows = report.validatorResults
    .map((result) => `| ${result.id} | ${result.status} | ${result.command} | ${result.artifactPath} | ${result.surfaces.join(", ")} | ${result.blocker ?? "Current"} |`)
    .join("\n");
  return `# Targeted Behavior Evidence

Status: \`${report.status}\`  
Artifact: \`${ARTIFACT_PATH}\`  
Validator: \`npm run check:targeted-behavior-evidence\`

## Scope

This artifact records source-backed targeted behavior validator results from the latest code version. It is not runtime smoke, manual screenshot evidence, provider evidence, or production admin truth sample evidence.

## Summary

- Source commit: \`${report.sourceCommit}\`
- Latest code version: \`${report.latestCodeVersion}\`
- Passed: ${report.passed}
- Formal evidence impact: \`${report.formalEvidenceImpact}\`
- Does not clear: ${report.doesNotClear.map((gate) => `\`${gate}\``).join(", ")}

## Validator Results

| Lane | Status | Command | Artifact | Surfaces | Blocker |
| --- | --- | --- | --- | --- | --- |
${rows}

## Surfaces Covered

${report.surfacesCovered.map((surface) => `- ${surface}`).join("\n")}

## Not Covered

${report.notCovered.map((item) => `- ${item}`).join("\n")}

## Readiness Impact

Targeted behavior evidence can improve source behavior confidence when fresh and passing. It cannot replace manual screenshot evidence, provider smoke, runtime smoke, real-device smoke, deployed runtime smoke, or production admin truth samples.
`;
}

function main() {
  const head = currentHead();
  const report = buildTargetedBehaviorEvidenceReport({
    generatedAtUtc: new Date().toISOString(),
    latestCodeVersion: head,
    validatorResults: validatorResultsForHead(head),
    notCovered: [
      "manual screenshot QA",
      "provider smoke",
      "runtime smoke",
      "admin truth sample",
      "real-device smoke",
      "deployed runtime smoke",
    ],
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateTargetedBehaviorEvidenceReport(report);
  if (failures.length > 0) {
    console.error("Targeted behavior evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Targeted behavior evidence validation passed. status=${report.status} validators=${report.validatorResults.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
