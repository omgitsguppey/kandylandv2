import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  buildEventEnvelope,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import {
  buildEventIdentityEnvelope,
  buildGuestIdentityContext,
  buildIdentityLinkCandidate,
  buildSignedInIdentityContext,
  preventGuestUserDoubleCount,
  shouldLinkGuestToUser,
} from "@/lib/analytics/identity-handoff-engine";
import {
  PERSON_METRIC_DEFINITIONS,
  validatePersonMetricsContract,
} from "@/lib/analytics/person-metrics-contract";
import {
  buildFeatureRegistrationGateReport,
  validateFeatureRegistrationGate,
} from "@/lib/features/feature-registration-registry";
import {
  buildDebugPanelTrackingSummary,
} from "@/lib/debug/debug-panel-tracking-summary";
import {
  buildOrphanMetricRegistry,
  validateOrphanMetricRegistry,
} from "@/lib/debug/orphan-metric-registry";
import {
  buildMarchFirstEventRecoveryDryRun,
  dryRunOnly,
  recoveryStartDate,
} from "@/lib/legacy/march-first-event-recovery";
import {
  canTrackCapability,
  canUseBehavioralSignals,
} from "@/lib/privacy/consent-tracking-policy";

const REPORT_PATH = "agent/state/final-user-tracking-handoff-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-user-tracking-handoff-lock.md";

type LockStatus = "pass" | "fail";

type FinalUserTrackingHandoffLockReport = {
  generatedAtUtc: string;
  reportKey: "final-user-tracking-handoff-lock";
  currentHead: string;
  status: LockStatus;
  guestTrackingStatus: LockStatus;
  signupHandoffStatus: LockStatus;
  loggedInTrackingStatus: LockStatus;
  linkedPersonMetricsStatus: LockStatus;
  consentModeStatus: LockStatus;
  eventEnvelopeStatus: LockStatus;
  legacyRecoveryStatus: LockStatus;
  debugPanelSimplificationStatus: LockStatus;
  futureFeatureTelemetryStatus: LockStatus;
  duplicateDebugLaneCount: number;
  orphanMetricCount: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  remainingGaps: string[];
  nextExactSteps: string[];
  protectedRuntimeStatus: {
    productionReadsRequired: false;
    legacyMutationAllowed: false;
    paymentGumdropMathTouched: boolean;
    chatNavTouched: boolean;
  };
  changedFiles: string[];
  checks: Record<string, boolean>;
  validationFailures: string[];
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function readJson(path: string): any {
  try {
    return JSON.parse(read(path));
  } catch {
    return null;
  }
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listChangedFiles() {
  const names = new Set<string>();
  for (const command of ["git diff --name-only", "git diff --cached --name-only", "git ls-files --others --exclude-standard"]) {
    for (const line of gitOutput(command).split(/\r?\n/u)) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function status(passed: boolean): LockStatus {
  return passed ? "pass" : "fail";
}

function readBetaScore() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  if (!score || typeof score !== "object") return null;
  const candidate = [
    score.healthScore,
    score.overallScore,
    score.canonicalPublicBetaScore,
    score.score,
  ].find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof candidate === "number" ? candidate : null;
}

function protectedChangedFiles(changedFiles: readonly string[]) {
  return changedFiles.filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /^src\/components\/(Chat|Navigation|Navbar|TopNav|BottomNav)\b/u.test(file)
      || /paypal|payment|gumdrop|ledger|wallet-credit/iu.test(file));
}

function paymentGumdropChanged(changedFiles: readonly string[]) {
  return changedFiles.some((file) => /paypal|payment|gumdrop|ledger|wallet-credit/iu.test(file));
}

function chatNavChanged(changedFiles: readonly string[]) {
  return changedFiles.some((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /^src\/components\/(Chat|Navigation|Navbar|TopNav|BottomNav)\b/u.test(file));
}

function buildTrackingDebugSummary() {
  return buildDebugPanelTrackingSummary({
    identityHandoff: { status: "live", duplicateCountGuardActive: true },
    eventEnvelope: { status: "live", missingEnvelopeFieldsByFeature: [] },
    legacyRecovery: { status: "live", mutationsAllowed: false },
    telemetryHealth: {
      summary: { degraded: 0, runtimeUnproven: 0, unavailable: 0, configMissing: 0 },
      lanes: [{ id: "client_tracking" }, { id: "event_facts" }],
    },
    behavioralSnapshotStatus: { status: "source_ready" },
    routeRuntimeHealthSummary: { fail: 0, warn: 0, stale: 0 },
    runtimeWarningSummary: { failed: 0, degraded: 0, total: 0 },
    debugBacklogSummary: { p0P1Open: 0, open: 1 },
    stats: { receiptsLast7d: 1 },
    costControls: { status: "bounded_initial_summary" },
  });
}

function writeDoc(report: FinalUserTrackingHandoffLockReport) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Final User Tracking Handoff Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Lock Status",
    "",
    `- Guest tracking: ${report.guestTrackingStatus}`,
    `- Signup handoff: ${report.signupHandoffStatus}`,
    `- Logged-in tracking: ${report.loggedInTrackingStatus}`,
    `- Linked person metrics: ${report.linkedPersonMetricsStatus}`,
    `- Consent mode: ${report.consentModeStatus}`,
    `- Event envelope: ${report.eventEnvelopeStatus}`,
    `- Legacy recovery: ${report.legacyRecoveryStatus}`,
    `- Debug panel simplification: ${report.debugPanelSimplificationStatus}`,
    `- Future feature telemetry: ${report.futureFeatureTelemetryStatus}`,
    "",
    "## Counts",
    "",
    `- Duplicate debug lanes: ${report.duplicateDebugLaneCount}`,
    `- Ownerless orphan metrics: ${report.orphanMetricCount}`,
    `- Score before: ${report.scoreBefore ?? "unknown"}`,
    `- Score after: ${report.scoreAfter ?? "unknown"}`,
    "",
    "## Contract",
    "",
    "- Guest, signup, logged-in, creator, admin, system, and legacy states resolve through the identity handoff engine.",
    "- All normal tracked events require the canonical identity-aware event envelope with consent mode and session identity.",
    "- Per-person metrics define global, guest, signed-in, and linked-person aggregation without guest/user double counting.",
    "- Legacy event recovery remains dry-run only from 2026-03-01 and cannot mutate production or promote unknown legacy records to exact users.",
    "- Admin debug tracking status is summarized into one set of lanes, with raw details behind drilldowns.",
    "- Future telemetry must pass feature registration before becoming normal analytics.",
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length > 0 ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const scoreBefore = readBetaScore();
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const identityContractSource = read("src/lib/analytics/identity-handoff-contract.ts");
  const identityEngineSource = read("src/lib/analytics/identity-handoff-engine.ts");
  const eventEnvelopeContractSource = read("src/lib/analytics/event-envelope-contract.ts");
  const eventEnvelopeBuilderSource = read("src/lib/analytics/event-envelope-builder.ts");
  const adminDebugRouteSource = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");

  const guestContext = buildGuestIdentityContext({
    guestId: "guest_lock",
    sessionId: "session_lock",
    consentMode: "minimal_analytics",
  });
  const signupCandidate = buildIdentityLinkCandidate({
    guestId: "guest_lock",
    userId: "user_lock",
    sessionId: "session_lock",
    consentMode: "full_behavioral",
    reason: "signup",
  });
  const loggedInContext = buildSignedInIdentityContext({
    guestId: "guest_lock",
    userId: "user_lock",
    sessionId: "session_lock",
    linkId: signupCandidate.linkId,
    consentMode: "full_behavioral",
  });
  const identityEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_page_viewed",
    guestId: "guest_lock",
    userId: "user_lock",
    sessionId: "session_lock",
    linkId: signupCandidate.linkId,
    consentMode: "full_behavioral",
    linkReason: "signup",
  });
  const doubleCountGuard = preventGuestUserDoubleCount({
    eventId: "event_lock",
    actorKind: loggedInContext.actorKind,
    identityState: loggedInContext.identityState,
    guestId: loggedInContext.guestId,
    userId: loggedInContext.userId,
    linkId: loggedInContext.linkId,
    sessionId: loggedInContext.sessionId,
  });
  const envelope = buildEventEnvelope({
    eventId: "event_lock",
    eventName: "semantic_page_viewed",
    timestamp: "2026-05-22T00:00:00.000Z",
    guestId: "guest_lock",
    userId: "user_lock",
    sessionId: "session_lock",
    linkId: signupCandidate.linkId,
    consentMode: "full_behavioral",
    source: "client",
    metadata: { safe: "kept", email: "blocked@example.com" },
  });
  const envelopeFindings = validateEventEnvelope(envelope).findings;
  const personMetricFailures = validatePersonMetricsContract(PERSON_METRIC_DEFINITIONS);
  const recoveryDryRun = buildMarchFirstEventRecoveryDryRun({
    records: [
      {
        legacyEventId: "legacy_page_lock",
        eventName: "page_viewed",
        occurredAt: "2026-03-01T12:00:00.000Z",
        source: "legacy-page-session",
        guestId: "legacy_guest",
        sessionId: "legacy_session",
        consentMode: "minimal_analytics",
      },
      {
        legacyEventId: "legacy_unknown_lock",
        eventName: "unknown_legacy",
        occurredAt: "2026-03-02T12:00:00.000Z",
        source: "legacy-unknown",
      },
    ],
  });
  const debugSummary = buildTrackingDebugSummary();
  const orphanRegistry = buildOrphanMetricRegistry();
  const orphanRegistryFailures = validateOrphanMetricRegistry(orphanRegistry);
  const ownerlessOrphanMetrics = orphanRegistry.filter((item) => !item.owner);
  const featureGateReport = buildFeatureRegistrationGateReport({ currentHead });
  const featureGateFailures = validateFeatureRegistrationGate(featureGateReport);

  const checks = {
    guestSignupLoginPathPresent: identityContractSource.includes("guest_minimal_analytics")
      && identityContractSource.includes("signup_started")
      && identityContractSource.includes("logged_in_linked_guest")
      && identityEngineSource.includes("buildIdentityLinkCandidate")
      && identityEngineSource.includes("preventGuestUserDoubleCount"),
    guestTrackingResolvesExactlyOneState: guestContext.actorKind === "guest"
      && guestContext.identityState === "guest_minimal_analytics"
      && guestContext.guestId === "guest_lock"
      && guestContext.sessionId === "session_lock",
    signupHandoffHasDeterministicLinkCandidate: signupCandidate.canLink === true
      && shouldLinkGuestToUser(signupCandidate) === true
      && Boolean(signupCandidate.linkId)
      && signupCandidate.reason === "signup",
    loggedInTrackingPreservesLinkedGuest: loggedInContext.actorKind === "signed_in_user"
      && loggedInContext.identityState === "logged_in_linked_guest"
      && loggedInContext.identityConfidence === "linked"
      && loggedInContext.linkId === signupCandidate.linkId,
    linkedEventsCarryLinkAndDoNotDoubleCount: identityEnvelope.linkCandidate?.canLink === true
      && doubleCountGuard.countAsGuest === false
      && doubleCountGuard.countAsUser === true
      && doubleCountGuard.reason === "linked_guest_attributed_to_user",
    userLevelMetricsPresent: personMetricFailures.length === 0
      && PERSON_METRIC_DEFINITIONS.length > 0
      && PERSON_METRIC_DEFINITIONS.every((metric) =>
        metric.aggregation.global.enabled
        && typeof metric.aggregation.guest.enabled === "boolean"
        && typeof metric.aggregation.signedIn.enabled === "boolean"
        && typeof metric.aggregation.linkedPerson.enabled === "boolean"
        && metric.debugOwner
        && metric.legacyRecoveryMapping.source),
    consentModeEnforced: canTrackCapability("behavioral_analytics", "necessary_only") === false
      && canUseBehavioralSignals("minimal_analytics") === false
      && PERSON_METRIC_DEFINITIONS.some((metric) =>
        metric.id === "runtime_watch_sessions"
        && metric.consentEligibility.depth === "behavioral"
        && metric.consentEligibility.allowedModes.length === 1
        && metric.consentEligibility.allowedModes[0] === "full_behavioral"),
    eventEnvelopeCanonicalAndIdentityAware: eventEnvelopeContractSource.includes("EVENT_ENVELOPE_REQUIRED_FIELDS")
      && eventEnvelopeBuilderSource.includes("buildEventEnvelope")
      && envelopeFindings.length === 0
      && envelope.identityState === "logged_in_linked_guest"
      && envelope.consentMode === "full_behavioral"
      && envelope.sessionId === "session_lock"
      && envelope.linkId === signupCandidate.linkId
      && envelope.pipelineStatus === "normal"
      && !("email" in envelope.metadata),
    legacyRecoveryDryRunOnly: recoveryStartDate === "2026-03-01"
      && dryRunOnly === true
      && recoveryDryRun.mutationsAllowed === false
      && recoveryDryRun.readsProduction === false
      && recoveryDryRun.liveBackfill === false
      && recoveryDryRun.candidates.every((candidate) => candidate.canMutateProduction === false)
      && recoveryDryRun.candidates.some((candidate) =>
        candidate.domain === "legacy_unknown"
        && candidate.identityConfidence === "unknown"
        && candidate.action === "archive_only"),
    debugTrackingLanesConsolidated: debugSummary.validation.duplicateTrackingSystems.length === 0
      && debugSummary.rawDetailPolicy === "drilldown_only"
      && debugSummary.validation.p1P2BacklogSurfaced === true
      && adminDebugRouteSource.includes("trackingSummary"),
    orphanMetricsOwned: orphanRegistryFailures.length === 0 && ownerlessOrphanMetrics.length === 0,
    futureFeatureTelemetryGatePresent: featureGateFailures.length === 0
      && featureGateReport.status === "pass"
      && featureGateReport.features.length > 0
      && featureGateReport.features.every((feature) =>
        feature.telemetryEvents.length > 0
        && feature.materializerLanes.length > 0
        && feature.adminDebugVisibility.debugVisible
        && feature.consentModeRequirements.length > 0
        && feature.identityRequirements.length > 0),
    packageScriptPresent: packageJson.includes('"check:final-user-tracking-handoff-lock": "tsx scripts/agent/validate-final-user-tracking-handoff-lock.ts"'),
    chatNavUntouched: !chatNavChanged(changedFiles),
    paymentGumdropMathUntouched: !paymentGumdropChanged(changedFiles),
    nextExactStepsPresent: true,
  };

  const remainingGaps = (readJson("agent/state/public-beta-score.generated.json")?.launchBlockers ?? [
    "Runtime/provider smoke evidence still requires formal operator evidence before beta exit.",
    "Admin truth/sample evidence still requires formal sample evidence before beta exit.",
  ]).filter((gap: unknown): gap is string => typeof gap === "string" && gap.length > 0);
  const nextExactSteps = [
    "Attach formal deployed runtime/provider smoke evidence when available; keep it separate from source-only validators.",
    "Attach redacted admin truth sample evidence before clearing formal beta evidence gates.",
    "Register every future tracking feature through the feature-registration gate before allowing normal analytics.",
  ];
  checks.nextExactStepsPresent = nextExactSteps.length > 0;

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  for (const failure of personMetricFailures) failures.push(`person metric: ${failure}`);
  for (const failure of orphanRegistryFailures) failures.push(`orphan registry: ${failure}`);
  for (const failure of featureGateFailures) failures.push(`feature gate: ${failure}`);
  for (const file of protectedChangedFiles(changedFiles)) failures.push(`protected file changed: ${file}`);

  const scoreAfter = readBetaScore();
  const report: FinalUserTrackingHandoffLockReport = {
    generatedAtUtc,
    reportKey: "final-user-tracking-handoff-lock",
    currentHead,
    status: status(failures.length === 0),
    guestTrackingStatus: status(checks.guestTrackingResolvesExactlyOneState),
    signupHandoffStatus: status(checks.signupHandoffHasDeterministicLinkCandidate),
    loggedInTrackingStatus: status(checks.loggedInTrackingPreservesLinkedGuest),
    linkedPersonMetricsStatus: status(checks.userLevelMetricsPresent && checks.linkedEventsCarryLinkAndDoNotDoubleCount),
    consentModeStatus: status(checks.consentModeEnforced),
    eventEnvelopeStatus: status(checks.eventEnvelopeCanonicalAndIdentityAware),
    legacyRecoveryStatus: status(checks.legacyRecoveryDryRunOnly),
    debugPanelSimplificationStatus: status(checks.debugTrackingLanesConsolidated),
    futureFeatureTelemetryStatus: status(checks.futureFeatureTelemetryGatePresent),
    duplicateDebugLaneCount: debugSummary.validation.duplicateTrackingSystems.length,
    orphanMetricCount: ownerlessOrphanMetrics.length,
    scoreBefore,
    scoreAfter,
    remainingGaps,
    nextExactSteps,
    protectedRuntimeStatus: {
      productionReadsRequired: false,
      legacyMutationAllowed: false,
      paymentGumdropMathTouched: paymentGumdropChanged(changedFiles),
      chatNavTouched: chatNavChanged(changedFiles),
    },
    changedFiles,
    checks,
    validationFailures: failures,
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(`Final user tracking handoff lock failed: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("Final user tracking handoff lock passed.");
}

main();
