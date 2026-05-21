import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  canTrackEvent,
  canUseBehavioralSignals,
  getConsentUpgradeEffect,
} from "../../src/lib/privacy/consent-tracking-policy";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/final-behavioral-privacy-telemetry-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-behavioral-privacy-telemetry-lock.md";

type Status = "pass" | "fail" | "missing";
type LockStatus = "locked_with_formal_gates_remaining" | "blocked";

type BuildOverrides = {
  minimalProductUsageAllowed?: boolean;
  minimalBehavioralAllowed?: boolean;
  acceptAllEnablesBehavioral?: boolean;
  legacyUnknownPromotesFullBehavior?: boolean;
  cookieBannerMobileTruncates?: boolean;
  futureFeatureContractPresent?: boolean;
  guestLoginHandoffVerified?: boolean;
  protectedChanges?: string[];
  nextExactSteps?: string[];
};

export type FinalBehavioralPrivacyTelemetryLockOptions = {
  rootDir?: string;
  generatedAtUtc?: string;
  currentHead?: string;
  scoreBefore?: number;
  scoreAfter?: number;
  overrides?: BuildOverrides;
};

export type FinalBehavioralPrivacyTelemetryLockReport = {
  generatedAtUtc: string;
  reportKey: "final-behavioral-privacy-telemetry-lock";
  currentHead: string;
  overallStatus: LockStatus;
  consentContractStatus: Status;
  cookieBannerStatus: Status;
  guestIdentityStatus: Status;
  signupHandoffStatus: Status;
  loginHandoffStatus: Status;
  perUserBehaviorStatus: Status;
  minimalAnalyticsStatus: "minimal_product_usage_only" | "blocked";
  fullBehavioralStatus: "full_behavioral_enabled" | "blocked";
  legacyRecoveryStatus: Status;
  futureFeatureTelemetryStatus: Status;
  remainingManualOnlyItems: string[];
  scoreBefore: number;
  scoreAfter: number;
  nextExactSteps: string[];
  evidence: {
    minimalProductUsageAllowed: boolean;
    minimalBehavioralAllowed: boolean;
    acceptAllMode: string;
    acceptAllEnablesBehavioral: boolean;
    legacyUnknownPromotesFullBehavior: boolean;
    unregisteredFutureEventQuarantined: boolean;
    guestLoginHandoffVerified: boolean;
    cookieBannerMobileTruncates: boolean;
  };
  protectedChanges: string[];
  sourceArtifacts: Record<string, string>;
  validationFailures: string[];
};

function git(args: string[], rootDir = ROOT) {
  try {
    return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string, rootDir = ROOT) {
  return readFileSync(join(rootDir, path), "utf8");
}

function readJson(path: string, rootDir = ROOT): Record<string, unknown> | null {
  const fullPath = join(rootDir, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string, rootDir = ROOT) {
  const fullPath = join(rootDir, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function boolValue(value: unknown) {
  return value === true;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function statusFromArtifact(artifact: Record<string, unknown> | null): Status {
  if (!artifact) return "missing";
  const status = stringValue(artifact.status || artifact.overallStatus);
  if (status === "pass" || status === "live" || status === "source_ready" || status === "warning") return "pass";
  return status === "fail" || status === "blocked" ? "fail" : "pass";
}

function changedFiles(rootDir = ROOT) {
  const changed = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"]] as const) {
    for (const line of git([...args], rootDir).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      changed.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...changed].sort();
}

function protectedChanges(rootDir = ROOT) {
  return changedFiles(rootDir).filter((path) =>
    /^src\/components\/Navigation\//u.test(path)
    || /^src\/components\/Navbar/u.test(path)
    || /^src\/app\/dashboard\/chat/u.test(path)
    || /\/chat\//iu.test(path)
    || /paypal|payment|gumdrop/i.test(path));
}

function artifactHead(artifact: Record<string, unknown> | null) {
  return stringValue(artifact?.currentHead || artifact?.sourceCommit || artifact?.generatedAtUtc || artifact?.generatedAt);
}

function renderDoc(report: FinalBehavioralPrivacyTelemetryLockReport) {
  return [
    "# Final Behavioral Privacy Telemetry Lock",
    "",
    `Status: ${report.overallStatus}`,
    "",
    "Privacy-aware behavioral telemetry is locked as a source-only contract. Cookie consent, guest identity, signup/login handoff, per-user behavior math, legacy privacy recovery, and future feature event registration are connected without claiming production usage, mutating legacy data, or clearing formal beta gates.",
    "",
    "## Report",
    "",
    `- Consent contract: ${report.consentContractStatus}`,
    `- Cookie banner: ${report.cookieBannerStatus}`,
    `- Guest identity: ${report.guestIdentityStatus}`,
    `- Signup handoff: ${report.signupHandoffStatus}`,
    `- Login handoff: ${report.loginHandoffStatus}`,
    `- Per-user behavior: ${report.perUserBehaviorStatus}`,
    `- Minimal analytics: ${report.minimalAnalyticsStatus}`,
    `- Full behavioral: ${report.fullBehavioralStatus}`,
    `- Legacy recovery: ${report.legacyRecoveryStatus}`,
    `- Future feature telemetry: ${report.futureFeatureTelemetryStatus}`,
    `- Score before: ${report.scoreBefore}`,
    `- Score after: ${report.scoreAfter}`,
    "",
    "## Remaining Manual Only Items",
    "",
    ...report.remainingManualOnlyItems.map((item) => `- ${item}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Guardrails",
    "",
    `- Minimal analytics allows product/performance analytics: ${report.evidence.minimalProductUsageAllowed}`,
    `- Minimal analytics allows behavioral signals: ${report.evidence.minimalBehavioralAllowed}`,
    `- Accept all enables deeper behavioral tracking: ${report.evidence.acceptAllEnablesBehavioral}`,
    `- Unknown legacy consent promotes full behavior: ${report.evidence.legacyUnknownPromotesFullBehavior}`,
    `- Unregistered future event quarantined: ${report.evidence.unregisteredFutureEventQuarantined}`,
    `- Protected changes: ${report.protectedChanges.length ? report.protectedChanges.join(", ") : "none"}`,
    "",
    "## Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- None"]),
    "",
  ].join("\n");
}

export function buildFinalBehavioralPrivacyTelemetryLock(
  options: FinalBehavioralPrivacyTelemetryLockOptions = {},
): FinalBehavioralPrivacyTelemetryLockReport {
  const rootDir = options.rootDir ?? ROOT;
  const consent = readJson("agent/state/consent-tracking-contract.generated.json", rootDir);
  const cookie = readJson("agent/state/cookie-banner-settings-sync.generated.json", rootDir);
  const identity = readJson("agent/state/identity-handoff-refinement.generated.json", rootDir);
  const behavior = readJson("agent/state/behavior-math-verification.generated.json", rootDir);
  const legacy = readJson("agent/state/privacy-behavior-legacy-recovery.generated.json", rootDir);
  const extensibility = readJson("agent/state/behavioral-extensibility-layer.generated.json", rootDir);
  const score = readJson("agent/state/public-beta-score.generated.json", rootDir);

  const acceptAll = getConsentUpgradeEffect("accept_all");
  const minimalProductUsageAllowed = options.overrides?.minimalProductUsageAllowed
    ?? canTrackEvent("privacy_page_viewed", "minimal_analytics");
  const minimalBehavioralAllowed = options.overrides?.minimalBehavioralAllowed
    ?? canUseBehavioralSignals("minimal_analytics");
  const acceptAllEnablesBehavioral = options.overrides?.acceptAllEnablesBehavioral
    ?? (acceptAll.consentMode === "full_behavioral" && acceptAll.enablesBehavioralTracking);

  const cookieMobile = objectValue(cookie?.mobileBanner);
  const consentChoices = objectValue(cookie?.consentChoices);
  const settingsSync = objectValue(cookie?.settingsSync);
  const identityChecks = objectValue(identity?.checks);
  const behaviorReport = objectValue(behavior?.report);
  const behaviorSummary = objectValue(behaviorReport.summary);
  const legacyPlan = objectValue(legacy?.plan);
  const legacyRecords = Array.isArray(legacyPlan.records) ? legacyPlan.records as Array<Record<string, unknown>> : [];
  const legacyUnknownPromotesFullBehavior = options.overrides?.legacyUnknownPromotesFullBehavior
    ?? legacyRecords.some((record) =>
      record.legacyClass === "legacy_consent_unknown"
      && objectValue(record.candidateNormalizedRecord).consentMode === "full_behavioral");

  const sampleClassifications = objectValue(extensibility?.sampleClassifications);
  const unregistered = objectValue(sampleClassifications.unregistered);
  const unregisteredFutureEventQuarantined = unregistered.accepted === false
    && unregistered.quarantineReason === "unregistered_event";
  const futureFeatureContractPresent = options.overrides?.futureFeatureContractPresent
    ?? (statusFromArtifact(extensibility) === "pass"
      && numberValue(extensibility?.extensionMetadataEvents) > 0
      && boolValue(unregisteredFutureEventQuarantined));

  const guestLoginHandoffVerified = options.overrides?.guestLoginHandoffVerified
    ?? (boolValue(identityChecks.stateMachineHasSignupAndLogin)
      && boolValue(identityChecks.deterministicIdempotentLink)
      && boolValue(identityChecks.identityLinkConsentAware)
      && boolValue(identityChecks.authContextPassesConsentMode)
      && boolValue(identityChecks.trackerCarriesConsentMode)
      && boolValue(identityChecks.linkedGuestNoDoubleCount)
      && boolValue(identityChecks.trackerContextHasLinkId)
      && boolValue(identityChecks.noBroadReadOnLogin));

  const cookieBannerMobileTruncates = options.overrides?.cookieBannerMobileTruncates
    ?? (!boolValue(cookieMobile.noTruncation) || !boolValue(cookieMobile.compact320Safe));

  const sourceFiles = {
    consentContract: "agent/state/consent-tracking-contract.generated.json",
    cookieBanner: "agent/state/cookie-banner-settings-sync.generated.json",
    identityHandoff: "agent/state/identity-handoff-refinement.generated.json",
    behaviorMath: "agent/state/behavior-math-verification.generated.json",
    legacyRecovery: "agent/state/privacy-behavior-legacy-recovery.generated.json",
    futureTelemetry: "agent/state/behavioral-extensibility-layer.generated.json",
  };

  const scoreValue = numberValue(score?.healthScore ?? score?.overallScore ?? score?.score);
  const protectedTouched = options.overrides?.protectedChanges ?? protectedChanges(rootDir);
  const nextExactSteps = options.overrides?.nextExactSteps ?? [
    "Keep minimal analytics mapped to product_usage_minimal and performance_analytics only; do not promote it to behavioral personalization.",
    "Register new feature events in src/lib/telemetry-catalog.ts and src/lib/behavioral/behavior-feature-registry.ts before any tracker emits them.",
    "Attach UI visual/manual smoke evidence for layout-sensitive surfaces before clearing the visual gate.",
    "Attach deployed runtime/provider smoke artifacts before clearing runtime or provider gates.",
    "Attach redacted admin truth sample evidence before clearing formal admin truth/sample gates.",
  ];

  const report: FinalBehavioralPrivacyTelemetryLockReport = {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "final-behavioral-privacy-telemetry-lock",
    currentHead: options.currentHead ?? git(["rev-parse", "HEAD"], rootDir),
    overallStatus: "locked_with_formal_gates_remaining",
    consentContractStatus: statusFromArtifact(consent),
    cookieBannerStatus: statusFromArtifact(cookie),
    guestIdentityStatus: guestLoginHandoffVerified ? "pass" : "fail",
    signupHandoffStatus: boolValue(identityChecks.stateMachineHasSignupAndLogin)
      && boolValue(identityChecks.deterministicIdempotentLink)
      && boolValue(settingsSync.guestSyncsWhenAccountDefault)
      ? "pass" : "fail",
    loginHandoffStatus: boolValue(identityChecks.identityRouteBlocksMinimalConsent)
      && boolValue(identityChecks.noBroadReadOnLogin)
      && boolValue(identityChecks.identityPersistenceRequiresAllowedConsent)
      ? "pass" : "fail",
    perUserBehaviorStatus: numberValue(behaviorSummary.linkedGuestEventsAttributedToUsers) > 0
      && numberValue(behaviorSummary.duplicateEventsDeduped) > 0
      && numberValue(behaviorSummary.legacyUnknownExcluded) > 0
      && boolValue(identityChecks.behaviorMathBlocksMinimalPersonBehavior)
      ? "pass" : "fail",
    minimalAnalyticsStatus: minimalProductUsageAllowed && !minimalBehavioralAllowed
      ? "minimal_product_usage_only" : "blocked",
    fullBehavioralStatus: acceptAllEnablesBehavioral && canUseBehavioralSignals("full_behavioral")
      ? "full_behavioral_enabled" : "blocked",
    legacyRecoveryStatus: statusFromArtifact(legacy),
    futureFeatureTelemetryStatus: futureFeatureContractPresent ? "pass" : "fail",
    remainingManualOnlyItems: [
      "UI visual/manual smoke",
      "Runtime/provider smoke",
      "Admin truth/sample evidence",
    ],
    scoreBefore: options.scoreBefore ?? scoreValue,
    scoreAfter: options.scoreAfter ?? scoreValue,
    nextExactSteps,
    evidence: {
      minimalProductUsageAllowed,
      minimalBehavioralAllowed,
      acceptAllMode: acceptAll.consentMode,
      acceptAllEnablesBehavioral,
      legacyUnknownPromotesFullBehavior,
      unregisteredFutureEventQuarantined,
      guestLoginHandoffVerified,
      cookieBannerMobileTruncates,
    },
    protectedChanges: protectedTouched,
    sourceArtifacts: Object.fromEntries(Object.entries(sourceFiles).map(([key, path]) => {
      const artifact = readJson(path, rootDir);
      return [key, artifactHead(artifact) || "missing"];
    })),
    validationFailures: [],
  };

  report.validationFailures = validateFinalBehavioralPrivacyTelemetryLock(report);
  report.overallStatus = report.validationFailures.length > 0 ? "blocked" : "locked_with_formal_gates_remaining";
  return report;
}

export function validateFinalBehavioralPrivacyTelemetryLock(report: FinalBehavioralPrivacyTelemetryLockReport) {
  const failures: string[] = [];

  if (report.minimalAnalyticsStatus !== "minimal_product_usage_only" || !report.evidence.minimalProductUsageAllowed) {
    failures.push("minimal analytics equals no tracking; product/performance analytics must remain allowed while behavioral personalization is blocked.");
  }
  if (report.evidence.minimalBehavioralAllowed) {
    failures.push("minimal analytics can emit full behavioral signals.");
  }
  if (report.fullBehavioralStatus !== "full_behavioral_enabled" || !report.evidence.acceptAllEnablesBehavioral) {
    failures.push("accept cookies does not enable deeper tracking.");
  }
  if (report.guestIdentityStatus !== "pass" || report.signupHandoffStatus !== "pass" || report.loginHandoffStatus !== "pass" || !report.evidence.guestLoginHandoffVerified) {
    failures.push("guest->login handoff unverified.");
  }
  if (report.futureFeatureTelemetryStatus !== "pass" || !report.evidence.unregisteredFutureEventQuarantined) {
    failures.push("future feature event contract missing.");
  }
  if (report.evidence.legacyUnknownPromotesFullBehavior) {
    failures.push("legacy unknown consent can become full behavior.");
  }
  if (report.evidence.cookieBannerMobileTruncates || report.cookieBannerStatus !== "pass") {
    failures.push("cookie banner mobile text truncates.");
  }
  if (report.protectedChanges.length > 0) {
    failures.push(`chat/nav/payment protected files touched: ${report.protectedChanges.join(", ")}`);
  }
  if (report.nextExactSteps.length === 0) {
    failures.push("no nextExactSteps.");
  }
  for (const [label, status] of Object.entries({
    consentContractStatus: report.consentContractStatus,
    perUserBehaviorStatus: report.perUserBehaviorStatus,
    legacyRecoveryStatus: report.legacyRecoveryStatus,
  })) {
    if (status !== "pass") {
      failures.push(`${label} is ${status}.`);
    }
  }
  return failures;
}

function runCli() {
  const report = buildFinalBehavioralPrivacyTelemetryLock();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));

  if (report.validationFailures.length > 0) {
    console.error("Final behavioral privacy telemetry lock validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Final behavioral privacy telemetry lock OK: ${report.overallStatus}, score ${report.scoreAfter}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
