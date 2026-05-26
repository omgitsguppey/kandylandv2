import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type TargetedBehaviorStatus = "passed" | "partial" | "failed";
export type TargetedBehaviorValidatorStatus = "pass" | "fail" | "unavailable" | "in_flight" | "superseded";

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
  classification?: "current_lock_validator" | "superseded_validator" | "in_flight_validator";
  requiredForCurrentLane?: boolean;
  replacementFor?: string[];
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

export const SUPERSEDED_TARGETED_BEHAVIOR_VALIDATORS = [
  "creator-settings-control-plane",
  "creator-pricing-wiring",
  "creator-broadcast-timeline-prep",
  "creator-profile-mobile-timeline",
  "global-marquee-truncated-titles",
  "creator-drop-status-metrics",
  "user-loading-wallet-mobile-refinement",
  "existing-algorithm-refinement",
  "overnight-wiring-integrity",
  "final-telemetry-closure-lock",
  "mobile-ui-final-lock",
  "user-creator-ui-parity",
  "source-truth-authority-map",
  "gumdrop-economy-accuracy",
  "creator-drop-management-approval",
  "creator-drop-manager-mobile-refinement",
] as const;

export const TARGETED_VALIDATORS = [
  {
    id: "final-parity-telemetry-lock",
    command: "npm run check:final-parity-telemetry-lock",
    artifactPath: "agent/state/final-parity-telemetry-lock.generated.json",
    surfaces: ["parity", "telemetry", "surface_state", "role_permission"],
    proves: "Surface parity, telemetry parity, state feedback, and role permission locks are registered as the current parity behavior validator.",
    replacementFor: ["user-creator-ui-parity", "overnight-wiring-integrity", "mobile-ui-final-lock"],
  },
  {
    id: "media-discovery-score-lock",
    command: "npm run check:media-discovery-score-lock",
    artifactPath: "agent/state/media-discovery-score-lock.generated.json",
    surfaces: ["media_upload", "private_media_access", "creator_discovery", "search_discovery"],
    proves: "Media, private access, discovery, relationship, and search behavior validators are registered as the current media/discovery behavior validator.",
    replacementFor: ["creator-profile-mobile-timeline", "creator-broadcast-timeline-prep"],
  },
  {
    id: "creator-monetization-readiness-lock",
    command: "npm run check:creator-monetization-readiness-lock",
    artifactPath: "agent/state/creator-monetization-readiness-lock.generated.json",
    surfaces: ["creator_monetization", "fan_pass", "entitlements", "chat_pricing", "admin_debug"],
    proves: "Creator monetization readiness is source-validated across Fan Pass, settings, entitlements, chat pricing, admin debug, telemetry, and person metrics.",
    replacementFor: ["creator-settings-control-plane", "creator-pricing-wiring", "gumdrop-economy-accuracy"],
  },
  {
    id: "auth-readiness-lock",
    command: "npm run check:auth-readiness-lock",
    artifactPath: "agent/state/auth-readiness-lock.generated.json",
    surfaces: ["auth", "session", "account_access"],
    proves: "Authentication readiness is registered as the current source behavior validator when the auth phase has landed.",
  },
  {
    id: "notification-pwa-score-lock",
    command: "npm run check:notification-pwa-score-lock",
    artifactPath: "agent/state/notification-pwa-score-lock.generated.json",
    surfaces: ["notifications", "pwa", "service_worker"],
    proves: "Notification and PWA readiness is registered as the current source behavior validator when the notification phase has landed.",
    replacementFor: ["creator-broadcast-timeline-prep"],
  },
  {
    id: "daily-task-debug-score-lock",
    command: "npm run check:daily-task-debug-score-lock",
    artifactPath: "agent/state/daily-task-debug-score-lock.generated.json",
    surfaces: ["daily_tasks", "task_rewards", "debug"],
    proves: "Daily task lifecycle, reward, telemetry, and debug behavior are registered as the current task behavior validator when landed.",
  },
  {
    id: "chat-functionality-score-lock",
    command: "npm run check:chat-functionality-score-lock",
    artifactPath: "agent/state/chat-functionality-score-lock.generated.json",
    surfaces: ["chat", "chat_gating", "chat_realtime"],
    proves: "Chat functionality score lock is registered as the current chat behavior validator when landed.",
  },
  {
    id: "final-testing-tracking-telemetry-lock",
    command: "npm run check:final-testing-tracking-telemetry-lock",
    artifactPath: "agent/state/final-testing-tracking-telemetry-lock.generated.json",
    surfaces: ["testing", "tracking", "telemetry"],
    proves: "Final testing/tracking telemetry lock is registered as the current testing and tracking behavior validator when landed.",
    replacementFor: ["final-telemetry-closure-lock"],
  },
  {
    id: "feature-registration-gate",
    command: "npm run check:feature-registration-gate",
    artifactPath: "agent/state/feature-registration-gate.generated.json",
    surfaces: ["feature_registration", "routes", "telemetry"],
    proves: "Feature registration behavior is source-validated for registered routes and telemetry.",
  },
  {
    id: "activity-verification-engine",
    command: "npm run check:activity-verification-engine",
    artifactPath: "agent/state/activity-verification-engine.generated.json",
    surfaces: ["activity_verification", "behavioral_intelligence", "telemetry"],
    proves: "Activity verification behavior is source-validated without provider or production reads.",
  },
  {
    id: "event-translation-bridge",
    command: "npm run check:event-translation-bridge",
    artifactPath: "agent/state/event-translation-bridge.generated.json",
    surfaces: ["event_translation", "telemetry", "feature_activity"],
    proves: "Telemetry event translation behavior is source-validated.",
  },
  {
    id: "person-metrics-hydration",
    command: "npm run check:person-metrics-hydration",
    artifactPath: "agent/state/person-metrics-hydration.generated.json",
    surfaces: ["person_metrics", "telemetry", "analytics"],
    proves: "Person metrics hydration behavior is source-validated.",
  },
  {
    id: "surface-state-parity",
    command: "npm run check:surface-state-parity",
    artifactPath: "agent/state/surface-state-parity.generated.json",
    surfaces: ["surface_state", "loading", "empty", "error", "permission"],
    proves: "Surface state behavior is source-validated across loading, empty, error, degraded, permission, and not-configured states.",
    replacementFor: ["user-loading-wallet-mobile-refinement", "mobile-ui-final-lock"],
  },
  {
    id: "role-permission-parity",
    command: "npm run check:role-permission-parity",
    artifactPath: "agent/state/role-permission-parity.generated.json",
    surfaces: ["role_permission", "user", "creator", "admin", "guest"],
    proves: "Role permission behavior is source-validated across user, creator, admin, guest, and system roles.",
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

function readReportStatus(report: Record<string, unknown> | null) {
  const status = report?.status ?? report?.overallStatus ?? report?.validationStatus;
  if (typeof status === "string") return status.toLowerCase();
  if (report?.passed === true || report?.ok === true || report?.valid === true) return "pass";
  if (report?.passed === false || report?.ok === false || report?.valid === false) return "fail";
  return undefined;
}

function validatorResultsForHead(head: string): TargetedBehaviorValidatorResult[] {
  return TARGETED_VALIDATORS.map((validator) => {
    const report = readJson(validator.artifactPath);
    const reportHead = readReportHead(report);
    const reportStatus = readReportStatus(report);
    let status: TargetedBehaviorValidatorStatus = "pass";
    let blocker: string | undefined;
    if (!hasPackageScript(validator.command)) {
      status = "in_flight";
      blocker = `${validator.command} is not defined in package.json; lane is treated as in-flight unless it becomes required.`;
    } else if (!report) {
      status = "in_flight";
      blocker = `${validator.artifactPath} is missing.`;
    } else if (reportStatus && /fail|failed|blocked/iu.test(reportStatus)) {
      status = "fail";
      blocker = `${validator.artifactPath} reports failing status ${reportStatus}.`;
    }
    return {
      id: validator.id,
      command: validator.command,
      status,
      artifactPath: validator.artifactPath,
      surfaces: [...validator.surfaces],
      proves: validator.proves,
      doesNotProve: DOES_NOT_PROVE,
      blocker,
      classification: status === "in_flight" ? "in_flight_validator" : "current_lock_validator",
      requiredForCurrentLane: status !== "in_flight",
      replacementFor: "replacementFor" in validator ? [...(validator.replacementFor ?? [])] : undefined,
      currentHead: reportHead ?? head,
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
  const inFlight = inputs.validatorResults.filter((result) => result.status === "in_flight");
  const blockingInFlight = inFlight.filter((result) => result.requiredForCurrentLane === true);
  const status: TargetedBehaviorStatus = failed.length > 0 || blockingInFlight.length > 0
    ? "failed"
    : unavailable.length > 0
      ? "partial"
      : "passed";
  const passed = status === "passed";
  const surfacesCovered = uniqueSorted(inputs.validatorResults.flatMap((result) => result.surfaces));
  const evidence = [
    `validatorCount=${inputs.validatorResults.length}`,
    `passedValidators=${inputs.validatorResults.filter((result) => result.status === "pass").length}`,
    `failedValidators=${failed.length}`,
    `unavailableValidators=${unavailable.length}`,
    `inFlightValidators=${inFlight.length}`,
    `surfacesCovered=${surfacesCovered.join(",")}`,
    `formalEvidenceImpact=source_behavior_only`,
    `supersededValidators=${SUPERSEDED_TARGETED_BEHAVIOR_VALIDATORS.join(",")}`,
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
      ? "Targeted behavior evidence was rebuilt from current lock validators, replacing obsolete per-surface source behavior artifacts."
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
        "Obsolete per-surface validators are superseded by current lock validators instead of being counted as current failures.",
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
    if (!["pass", "fail", "unavailable", "in_flight", "superseded"].includes(result.status)) failures.push(`${result.id} has invalid validator status.`);
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
