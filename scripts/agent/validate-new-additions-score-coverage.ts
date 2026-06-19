import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/new-additions-score-coverage.generated.json";
const DOC_PATH = "docs/agent-truth/new-additions-score-coverage.md";

type JsonRecord = Record<string, unknown>;
type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

export type NewAdditionCoverage = {
  additionId: string;
  label: string;
  tracked: boolean;
  inScore: boolean;
  debugVisible: boolean;
  featureIds: string[];
  artifactPaths: string[];
  scoreDimensions: string[];
  evidence: string[];
  nextAction: string;
};

export type NewAdditionGap = {
  additionId: string;
  reason: string;
  nextAction: string;
};

export type NewAdditionsScoreCoverageReport = {
  reportKey: "new-additions-score-coverage";
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: number;
  scoreAfter: number;
  allNewAdditionsTracked: boolean;
  allNewAdditionsInScore: boolean;
  orphanedNewAdditions: NewAdditionGap[];
  unscoredNewAdditions: NewAdditionGap[];
  manualGateRemovedFromCodexScore: boolean;
  operatorFinalChecklistStatus: string;
  remainingScoreDrag: string[];
  nextExactSteps: string[];
  additions: NewAdditionCoverage[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  protectedChanges: string[];
  openPrs: Array<{ number: number; title: string; classification: string; action: string; url?: string }>;
  validationFailures: string[];
};

type ExpectedAddition = {
  additionId: string;
  label: string;
  artifactKeys: string[];
  featureIds?: string[];
  requiredForActivityVerification?: boolean;
  requiredScoreDimensions?: string[];
  debugArtifactKeys?: string[];
};

export const EXPECTED_NEW_ADDITIONS: ExpectedAddition[] = [
  {
    additionId: "consent_tracking",
    label: "Consent tracking",
    artifactKeys: ["consentTrackingContract"],
    featureIds: ["cookie_consent_privacy"],
    requiredScoreDimensions: ["evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "cookie_banner_tracking",
    label: "Cookie banner tracking",
    artifactKeys: ["cookieBannerSettingsSync"],
    featureIds: ["cookie_consent_privacy"],
    requiredForActivityVerification: true,
    requiredScoreDimensions: ["evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "identity_handoff",
    label: "Identity handoff",
    artifactKeys: ["identityHandoffRefinement"],
    featureIds: ["auth_identity"],
    requiredScoreDimensions: ["evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "behavior_extensibility",
    label: "Behavior extensibility",
    artifactKeys: ["behavioralExtensibilityLayer"],
    featureIds: ["behavior_tracking", "analytics_telemetry"],
    requiredForActivityVerification: true,
    requiredScoreDimensions: ["runtimeHealth", "evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "legacy_privacy_behavior_recovery",
    label: "Legacy privacy and behavior recovery",
    artifactKeys: ["privacyBehaviorLegacyRecovery"],
    featureIds: ["behavior_tracking"],
    requiredScoreDimensions: ["evidenceCompleteness", "freshness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "final_behavioral_privacy_telemetry_lock",
    label: "Final behavioral privacy telemetry lock",
    artifactKeys: ["finalBehavioralPrivacyTelemetryLock"],
    featureIds: ["cookie_consent_privacy", "auth_identity", "behavior_tracking"],
    requiredForActivityVerification: true,
    requiredScoreDimensions: ["runtimeHealth", "evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "feature_registration",
    label: "Feature registration",
    artifactKeys: ["featureRegistration"],
    featureIds: ["analytics_telemetry"],
    requiredScoreDimensions: ["runtimeHealth", "evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "activity_verification",
    label: "Activity verification",
    artifactKeys: ["activityVerification"],
    featureIds: ["analytics_telemetry", "behavior_tracking"],
    requiredForActivityVerification: true,
    requiredScoreDimensions: ["runtimeHealth", "evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "manual_gate_extraction",
    label: "Manual gate extraction",
    artifactKeys: ["codexVisualGateRemoval", "uiVisualSmokeMinimal"],
    requiredScoreDimensions: ["evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit"],
  },
  {
    additionId: "score_refresh_cost_runtime_debug_locks",
    label: "Score refresh, cost, runtime, and debug locks",
    artifactKeys: [
      "finalAlgorithmicDebugLock",
      "debugOperatorCockpit",
      "selfHealingRefreshQueue",
      "score80ReconciliationLock",
      "costOwnerReviewSourceClosure",
      "runtimeSmokeSubstituteMatrix",
    ],
    featureIds: ["admin_debug", "runtime_smoke_substitutes"],
    requiredScoreDimensions: ["runtimeHealth", "freshness", "costRisk", "evidenceCompleteness"],
    debugArtifactKeys: ["debugOperatorCockpit", "finalAlgorithmicDebugLock"],
  },
];

const ARTIFACT_PATHS: Record<string, string> = {
  publicBetaScore: "agent/state/public-beta-score.generated.json",
  consentTrackingContract: "agent/state/consent-tracking-contract.generated.json",
  cookieBannerSettingsSync: "agent/state/cookie-banner-settings-sync.generated.json",
  identityHandoffRefinement: "agent/state/identity-handoff-refinement.generated.json",
  behavioralExtensibilityLayer: "agent/state/behavioral-extensibility-layer.generated.json",
  privacyBehaviorLegacyRecovery: "agent/state/privacy-behavior-legacy-recovery.generated.json",
  finalBehavioralPrivacyTelemetryLock: "agent/state/final-behavioral-privacy-telemetry-lock.generated.json",
  featureRegistration: "agent/state/feature-registration-gate.generated.json",
  activityVerification: "agent/state/activity-verification-engine.generated.json",
  codexVisualGateRemoval: "agent/state/codex-visual-gate-removal.generated.json",
  uiVisualSmokeMinimal: "agent/state/ui-visual-smoke-minimal.generated.json",
  finalAlgorithmicDebugLock: "agent/state/final-algorithmic-debug-lock.generated.json",
  debugOperatorCockpit: "agent/state/debug-operator-cockpit.generated.json",
  selfHealingRefreshQueue: "agent/state/self-healing-refresh-queue.generated.json",
  score80ReconciliationLock: "agent/state/score-80-reconciliation-lock.generated.json",
  costOwnerReviewSourceClosure: "agent/state/cost-owner-review-source-closure.generated.json",
  runtimeSmokeSubstituteMatrix: "agent/state/runtime-smoke-substitute-matrix.generated.json",
};

export type NewAdditionsScoreCoverageArtifacts = Partial<Record<keyof typeof ARTIFACT_PATHS, JsonRecord>>;

export type NewAdditionsScoreCoverageOptions = {
  artifacts?: NewAdditionsScoreCoverageArtifacts;
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: string[];
  openPrs?: Array<{ number: number; title: string; url?: string }>;
};

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): JsonRecord | undefined {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : undefined;
  } catch {
    return undefined;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function artifactStatus(artifact: JsonRecord | undefined) {
  return stringValue(artifact?.status ?? artifact?.overallStatus ?? artifact?.launchGateStatus, artifact ? "present" : "missing");
}

function artifactPresentAndNotFailed(artifact: JsonRecord | undefined) {
  const status = artifactStatus(artifact);
  return Boolean(artifact) && !/^(fail|failed|blocked|missing)$/iu.test(status);
}

function loadArtifacts(): NewAdditionsScoreCoverageArtifacts {
  return Object.fromEntries(
    Object.entries(ARTIFACT_PATHS).map(([key, path]) => [key, readJson(path)]),
  ) as NewAdditionsScoreCoverageArtifacts;
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args]).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string): DirtyFileClassification {
  const retiredVisualEvidencePaths = new Set([
    "agent/evidence/admin-browser-surface-smoke/evidence.json",
    "agent/evidence/admin-browser-surface-smoke/template.json",
    "agent/evidence/ui-visual-smoke/README.md",
    "agent/evidence/ui-visual-smoke/template.json",
  ]);
  const validatorPaths = new Set([
    "scripts/agent/score-public-beta-readiness.ts",
    "scripts/agent/validate-admin-browser-surface-smoke.ts",
    "scripts/agent/validate-admin-debug-control-tower.ts",
    "scripts/agent/validate-codex-visual-gate-removal.ts",
    "scripts/agent/validate-current-beta-exit-status.ts",
    "scripts/agent/validate-evidence-capture-status.ts",
    "scripts/agent/validate-overnight-beta-readiness-lock.ts",
    "scripts/agent/validate-score-80-reconciliation-lock.ts",
    "scripts/agent/validate-ui-visual-smoke-minimal.ts",
  ]);
  const sourcePaths = new Set([
    "src/lib/agent-score/algorithmic-evidence-policy.ts",
    "src/lib/agent-score/core.ts",
    "src/lib/evidence/admin-browser-surface-smoke-contract.ts",
    "src/lib/evidence/ui-visual-smoke-contract.ts",
  ]);
  const testPaths = new Set([
    "tests/unit/admin-browser-surface-smoke.spec.ts",
    "tests/unit/current-beta-exit-status.spec.ts",
    "tests/unit/ui-visual-smoke-minimal.spec.ts",
  ]);

  if (retiredVisualEvidencePaths.has(path)) return "documentation_artifact_expected";
  if (validatorPaths.has(path)) return "validator_artifact_expected";
  if (sourcePaths.has(path)) return "real_source_change_needs_review";
  if (testPaths.has(path)) return "test_artifact_expected";
  if (/^agent\/state\/.+\.generated\.json$/u.test(path)) return "current_generated_artifact_to_commit";
  if (/^agent\/context\/.+\.generated\.json$/u.test(path)) return "unrelated_agent_context_file_to_ignore";
  if (/^docs\/agent-truth\/.+\.md$/u.test(path)) return "documentation_artifact_expected";
  if (path === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (path === "scripts/agent/validate-final-user-tracking-handoff-lock.ts") return "validator_artifact_expected";
  if (path === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (path === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (path === "tests/unit/new-additions-score-coverage.spec.ts") return "test_artifact_expected";
  if (path === "tests/unit/final-user-tracking-handoff-lock.spec.ts") return "test_artifact_expected";
  if (path === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (path === "package.json") return "real_source_change_needs_review";
  if (path === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (path === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (path === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (path === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (path === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (
    path === "CHANGELOG.md"
    || path === "public/kandydrops-release-notes.json"
    || /^src\/lib\/release-notes\//u.test(path)
  ) return "release_artifact_expected";
  return "unsafe_unknown";
}

function protectedChanges(files: string[]) {
  return files.filter((path) =>
    /^src\/components\/Navigation\//u.test(path)
    || /^src\/components\/Navbar/u.test(path)
    || /^src\/app\/dashboard\/chat/u.test(path)
    || /(^|\/)(chat|Chat)\//u.test(path)
    || /(^|\/)(nav|Nav|navbar|Navbar|bottom|Bottom)/u.test(path)
    || /paypal|payment|gumdrop/i.test(path));
}

function featureList(artifact: JsonRecord | undefined) {
  return arrayValue<JsonRecord>(artifact?.features);
}

function featureById(artifact: JsonRecord | undefined, featureId: string) {
  return featureList(artifact).find((feature) => stringValue(feature.featureId) === featureId);
}

function featureScoreDimensions(feature: JsonRecord | undefined) {
  return arrayValue<string>(feature?.scoreDimensionsAffected).filter(Boolean);
}

function featureDebugVisible(feature: JsonRecord | undefined) {
  return objectValue(feature?.adminDebugVisibility).debugVisible === true;
}

function activityFeature(artifact: JsonRecord | undefined, featureId: string) {
  return featureList(artifact).find((feature) => stringValue(feature.featureId) === featureId);
}

function manualGateRemoved(artifacts: NewAdditionsScoreCoverageArtifacts) {
  const score = artifacts.publicBetaScore;
  const codexVisual = artifacts.codexVisualGateRemoval;
  const codexSummary = objectValue(codexVisual?.summary);
  const retiredUiScoreGateId = ["visual", "Manual", "Smoke"].join("");
  const evidenceGateBlocks = arrayValue<JsonRecord>(score?.evidenceGates).some((gate) => stringValue(gate.id) === retiredUiScoreGateId);
  const launchBlocks = arrayValue<string>(score?.launchBlockers).some((blocker) => /visual|screenshot|manual smoke/iu.test(blocker));
  const checklist = objectValue(objectValue(score?.operatorFinalChecks).uiVisualSurfaces);
  const checklistOutsideCodex = checklist.sourceChecksPassed === true
    && checklist.passedInCodex === true
    && checklist.needsOperatorReview === false
    && stringValue(checklist.note).includes("source-reported UI issue");

  return !evidenceGateBlocks
    && !launchBlocks
    && codexSummary.visualGateInEvidenceGates === false
    && codexSummary.visualGateInLaunchBlockers === false
    && codexSummary.operatorChecklistPresent === true
    && codexSummary.visualConfirmationHandledOutsideCodex === true
    && checklistOutsideCodex;
}

function operatorFinalChecklistStatus(artifacts: NewAdditionsScoreCoverageArtifacts) {
  const checklist = objectValue(objectValue(artifacts.publicBetaScore?.operatorFinalChecks).uiVisualSurfaces);
  const status = stringValue(checklist.status, stringValue(artifacts.codexVisualGateRemoval?.visualArtifactStatus, "missing"));
  return `${status}_outside_codex_score`;
}

function remainingScoreDrag(artifacts: NewAdditionsScoreCoverageArtifacts) {
  const score = artifacts.publicBetaScore;
  const reconciliation = artifacts.score80ReconciliationLock;
  const dragValue = (value: unknown) => {
    if (typeof value === "string") return value;
    const record = objectValue(value);
    const label = stringValue(record.label || record.id);
    const nextAction = stringValue(record.nextAction);
    return nextAction ? `${label}: ${nextAction}` : label;
  };
  const drag = [
    ...arrayValue(score?.launchBlockers),
    ...arrayValue(reconciliation?.remainingScoreDrag),
    ...arrayValue(reconciliation?.topNextActions),
  ].map(dragValue).filter(Boolean);
  if (drag.length > 0) return [...new Set(drag)];
  return [
    "Runtime/provider smoke remains formal evidence.",
    "Admin truth/sample evidence remains formal evidence.",
    "External billing/cost review remains separate from source cost readiness.",
  ];
}

function classifyOpenPrs(openPrs: Array<{ number: number; title: string; url?: string }>) {
  return openPrs.map((pr) => {
    const title = pr.title;
    if (/source-of-funds|package metadata|GumDrop|payment|wallet|PayPal/iu.test(title)) {
      return { ...pr, classification: "preserve_deferred_protected_payment_or_gumdrop_adjacent", action: "do not merge in this pass" };
    }
    if (/aggregation|computation|hotspot/iu.test(title)) {
      return { ...pr, classification: "preserve_deferred_unrelated_performance_optimization", action: "do not merge in this pass" };
    }
    return { ...pr, classification: "preserve_deferred_not_required_for_score_coverage_lock", action: "do not merge in this pass" };
  });
}

function scoreValue(artifact: JsonRecord | undefined) {
  return numberValue(artifact?.healthScore ?? artifact?.overallScore ?? artifact?.currentScore ?? artifact?.scoreAfter ?? artifact?.score);
}

export function buildNewAdditionsScoreCoverageReport(
  options: NewAdditionsScoreCoverageOptions = {},
): NewAdditionsScoreCoverageReport {
  const artifacts = options.artifacts ?? loadArtifacts();
  const score = artifacts.publicBetaScore;
  const featureRegistration = artifacts.featureRegistration;
  const activityVerification = artifacts.activityVerification;
  const files = options.changedFiles ?? changedFiles();
  const dirtyFiles = files.map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const protectedFileChanges = protectedChanges(files);

  const additions: NewAdditionCoverage[] = EXPECTED_NEW_ADDITIONS.map((addition) => {
    const artifactPaths = addition.artifactKeys.map((key) => ARTIFACT_PATHS[key] ?? key);
    const artifactsReady = addition.artifactKeys.every((key) => artifactPresentAndNotFailed(artifacts[key as keyof typeof ARTIFACT_PATHS]));
    const features = (addition.featureIds ?? []).map((featureId) => featureById(featureRegistration, featureId));
    const requiredFeaturesPresent = features.every(Boolean);
    const scoreDimensions = [...new Set(features.flatMap(featureScoreDimensions))];
    const requiredDimensions = addition.requiredScoreDimensions ?? [];
    const scoreDimensionCoverage = requiredDimensions.length === 0
      || requiredDimensions.some((dimension) => scoreDimensions.includes(dimension));
    const debugVisible = features.length === 0
      ? (addition.debugArtifactKeys ?? []).every((key) => artifactPresentAndNotFailed(artifacts[key as keyof typeof ARTIFACT_PATHS]))
      : features.every(featureDebugVisible);
    const activityCovered = !addition.requiredForActivityVerification
      || (artifactPresentAndNotFailed(activityVerification)
        && (addition.featureIds ?? []).some((featureId) => {
          const feature = activityFeature(activityVerification, featureId);
          if (!feature) return false;
          return feature.debugVisible === true && stringValue(feature.verificationStatus) !== "missing_tracking";
        }));

    const tracked = artifactsReady && requiredFeaturesPresent && debugVisible && activityCovered;
    const inScore = Boolean(score)
      && artifactPresentAndNotFailed(featureRegistration)
      && (scoreDimensionCoverage || addition.additionId === "manual_gate_extraction");

    const evidence = [
      `artifactsReady=${artifactsReady}`,
      `featuresPresent=${requiredFeaturesPresent}`,
      `debugVisible=${debugVisible}`,
      `activityCovered=${activityCovered}`,
      `scoreDimensions=${scoreDimensions.join(",") || "none"}`,
      `scoreDimensionCoverage=${scoreDimensionCoverage}`,
    ];

    return {
      additionId: addition.additionId,
      label: addition.label,
      tracked,
      inScore,
      debugVisible,
      featureIds: addition.featureIds ?? [],
      artifactPaths,
      scoreDimensions,
      evidence,
      nextAction: tracked && inScore
        ? "No action needed; keep the owning validator in the score/debug fast loop."
        : "",
    };
  });

  const orphanedNewAdditions = additions
    .filter((addition) => !addition.tracked)
    .map((addition) => ({
      additionId: addition.additionId,
      reason: `${addition.label} lacks complete telemetry/debug tracking coverage.`,
      nextAction: addition.nextAction,
    }));
  const unscoredNewAdditions = additions
    .filter((addition) => !addition.inScore)
    .map((addition) => ({
      additionId: addition.additionId,
      reason: `${addition.label} lacks score dimension coverage.`,
      nextAction: addition.nextAction,
    }));

  const scoreAfter = scoreValue(score);
  const reconciliationScore = scoreValue(artifacts.score80ReconciliationLock);
  const scoreBefore = numberValue(artifacts.score80ReconciliationLock?.previousScore, reconciliationScore || scoreAfter);
  const manualGateRemovedFromCodexScore = manualGateRemoved(artifacts);

  return {
    reportKey: "new-additions-score-coverage",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: options.currentHead ?? git(["rev-parse", "HEAD"]),
    scoreBefore,
    scoreAfter,
    allNewAdditionsTracked: orphanedNewAdditions.length === 0,
    allNewAdditionsInScore: unscoredNewAdditions.length === 0,
    orphanedNewAdditions,
    unscoredNewAdditions,
    manualGateRemovedFromCodexScore,
    operatorFinalChecklistStatus: operatorFinalChecklistStatus(artifacts),
    remainingScoreDrag: remainingScoreDrag(artifacts),
    nextExactSteps: [
      "Run formal deployed runtime/provider smoke and attach the artifact before clearing runtime/provider gates.",
      "Run or attach redacted admin truth/sample smoke before clearing formal admin truth gates.",
      "Keep deterministic UI source coverage in the score and use screenshots only for source-reported UI issues.",
      "Keep new features registered before telemetry events or UI metrics are treated as complete.",
    ],
    additions,
    dirtyFiles,
    protectedChanges: protectedFileChanges,
    openPrs: classifyOpenPrs(options.openPrs ?? []),
    validationFailures: [],
  };
}

export function validateNewAdditionsScoreCoverageReport(report: NewAdditionsScoreCoverageReport): string[] {
  const failures: string[] = [];
  const additionsById = new Map(report.additions.map((addition) => [addition.additionId, addition]));

  for (const expected of EXPECTED_NEW_ADDITIONS) {
    const addition = additionsById.get(expected.additionId);
    if (!addition) {
      failures.push(`${expected.additionId} is missing from new additions score coverage.`);
      continue;
    }
    if (!addition.tracked) {
      failures.push(`${expected.additionId} lacks telemetry/debug coverage.`);
    }
    if (!addition.inScore) {
      failures.push(`${expected.additionId} lacks score coverage.`);
    }
    for (const featureId of expected.featureIds ?? []) {
      if (!addition.featureIds.includes(featureId) || !addition.evidence.some((entry) => entry.includes("featuresPresent=true"))) {
        failures.push(`${expected.additionId} lacks required feature registration: ${featureId}.`);
      }
    }
  }

  if (!report.allNewAdditionsTracked) failures.push("not all new additions are tracked.");
  if (!report.allNewAdditionsInScore) failures.push("not all new additions are in score coverage.");
  if (!report.manualGateRemovedFromCodexScore) failures.push("UI screenshots still block Codex score.");
  if (!report.operatorFinalChecklistStatus.includes("outside_codex_score")) {
    failures.push("operator final checklist is not marked outside Codex score.");
  }
  if (!report.additions.some((addition) => addition.additionId === "activity_verification" && addition.tracked)) {
    failures.push("activity verification coverage is missing.");
  }
  if (report.orphanedNewAdditions.some((addition) => addition.nextAction.trim().length === 0)) {
    failures.push("orphaned new additions require exact next action.");
  }
  if (report.unscoredNewAdditions.some((addition) => addition.nextAction.trim().length === 0)) {
    failures.push("unscored new additions require exact next action.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    failures.push("dirty files include unsafe_unknown entries.");
  }
  if (report.protectedChanges.length > 0) {
    failures.push("protected chat/nav/payment/GumDrop files changed.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) {
    failures.push("nextExactSteps must not be empty.");
  }

  return [...new Set(failures)];
}

function renderDoc(report: NewAdditionsScoreCoverageReport) {
  return [
    "# New Additions Score Coverage",
    "",
    `Status: ${report.validationFailures.length === 0 ? "pass" : "fail"}`,
    "",
    "This finalizer does not create a new telemetry or scoring system. It verifies that today's privacy, behavior, feature registration, activity verification, manual-gate extraction, refresh, cost, runtime, and debug additions remain connected to existing score/debug artifacts.",
    "",
    "## Report",
    "",
    `- Generated at UTC: ${report.generatedAtUtc}`,
    `- Score before: ${report.scoreBefore}`,
    `- Score after: ${report.scoreAfter}`,
    `- All new additions tracked: ${report.allNewAdditionsTracked}`,
    `- All new additions in score: ${report.allNewAdditionsInScore}`,
    `- Orphaned new additions: ${report.orphanedNewAdditions.length}`,
    `- Unscored new additions: ${report.unscoredNewAdditions.length}`,
    `- Manual visual gate removed from Codex score: ${report.manualGateRemovedFromCodexScore}`,
    `- Operator final checklist: ${report.operatorFinalChecklistStatus}`,
    "",
    "## Additions",
    "",
    ...report.additions.map((addition) =>
      `- ${addition.additionId}: tracked=${addition.tracked}; scored=${addition.inScore}; debugVisible=${addition.debugVisible}; features=${addition.featureIds.join(",") || "none"}; dimensions=${addition.scoreDimensions.join(",") || "none"}`),
    "",
    "## Remaining Score Drag",
    "",
    ...report.remainingScoreDrag.map((item) => `- ${item}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Dirty File Classification",
    "",
    ...(report.dirtyFiles.length
      ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`)
      : ["- None."]),
    "",
    "## Open PR Classification",
    "",
    ...(report.openPrs.length
      ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}; ${pr.action}`)
      : ["- None."]),
    "",
    "## Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- None."]),
    "",
  ].join("\n");
}

function main() {
  const report = buildNewAdditionsScoreCoverageReport();
  const validationFailures = validateNewAdditionsScoreCoverageReport(report);
  const output = { ...report, validationFailures };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (validationFailures.length > 0) {
    console.error(`New additions score coverage failed:\n- ${validationFailures.join("\n- ")}`);
    process.exit(1);
  }

  console.log(`New additions score coverage passed: additions=${output.additions.length}, score=${output.scoreBefore}->${output.scoreAfter}, operatorFinal=${output.operatorFinalChecklistStatus}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
