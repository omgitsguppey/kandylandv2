import {
  FEATURE_REGISTRATION_REGISTRY,
} from "@/lib/features/feature-registration-registry";
import type {
  FeatureRegistration,
  FeatureRegistrationId,
} from "@/lib/features/feature-registration-contract";
import {
  getTelemetryEventExtensionMetadata,
  type TelemetryConsentRequirement,
} from "@/lib/telemetry-catalog";
import {
  canUseBehavioralSignals,
  normalizeConsentMode,
  type ConsentMode,
} from "@/lib/privacy/consent-tracking-policy";
import type { DebugBacklogItem } from "@/lib/debug/debug-backlog-contract";

export type ActivityEvidenceKind =
  | "source_backed_fixture"
  | "operator_confirmed"
  | "source_ready"
  | "unknown_legacy"
  | "fake";

export type ActivityVerificationStatus =
  | "verified_by_activity"
  | "source_ready_no_activity"
  | "blocked_by_consent"
  | "missing_tracking"
  | "orphaned"
  | "unknown_legacy";

export interface ActivitySourceEvent {
  featureId?: FeatureRegistrationId;
  eventName: string;
  sourceKind: ActivityEvidenceKind;
  guestId?: string;
  userId?: string;
  sessionId?: string;
  identityLinkId?: string;
  identityConfidence?: number;
  consentMode?: ConsentMode;
  materialized?: boolean;
  debugVisible?: boolean;
  sourcePath: string;
}

export interface ActivityVerificationInput {
  features?: readonly FeatureRegistration[];
  sourceEvents?: readonly ActivitySourceEvent[];
  consentMode?: ConsentMode;
  generatedAtUtc?: string;
  currentHead?: string;
}

export interface FeatureActivityVerification {
  featureId: FeatureRegistrationId;
  owner: string;
  guestActivitySeen: boolean;
  userActivitySeen: boolean;
  guestToUserLinked: boolean;
  identifiableMetricAvailable: boolean;
  consentModeAllowed: boolean;
  behaviorMaterialized: boolean;
  debugVisible: boolean;
  scoreEligible: boolean;
  verificationStatus: ActivityVerificationStatus;
  confidenceScore: number;
  evidence: string[];
  nextAction: string;
}

export interface ActivityVerificationReport {
  reportKey: "activity-verification-engine";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  legacyMutationAllowed: false;
  fakeActivityUsed: boolean;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  features: FeatureActivityVerification[];
  debugBacklogItems: DebugBacklogItem[];
  summary: {
    totalFeatures: number;
    verifiedByActivity: number;
    sourceReadyNoActivity: number;
    blockedByConsent: number;
    missingTracking: number;
    orphaned: number;
    unknownLegacy: number;
  };
  validationFailures: string[];
}

const STATUS_COUNTS: ActivityVerificationStatus[] = [
  "verified_by_activity",
  "source_ready_no_activity",
  "blocked_by_consent",
  "missing_tracking",
  "orphaned",
  "unknown_legacy",
];

function consentRequirementAllowed(requirement: TelemetryConsentRequirement, consentMode: ConsentMode) {
  if (requirement === "required_integrity") return true;
  if (requirement === "minimal_analytics") {
    return consentMode === "minimal_analytics" || consentMode === "full_analytics" || consentMode === "full_behavioral";
  }
  if (requirement === "full_analytics") {
    return consentMode === "full_analytics" || consentMode === "full_behavioral";
  }
  return canUseBehavioralSignals(consentMode);
}

function eventsForFeature(feature: FeatureRegistration, events: readonly ActivitySourceEvent[]) {
  const featureEvents = new Set(feature.telemetryEvents);
  return events.filter((event) =>
    event.featureId === feature.featureId
    || featureEvents.has(event.eventName)
    || getTelemetryEventExtensionMetadata(event.eventName)?.feature === getTelemetryEventExtensionMetadata(feature.telemetryEvents[0] ?? "")?.feature,
  );
}

function hasTracking(feature: FeatureRegistration, events: readonly ActivitySourceEvent[]) {
  if (feature.telemetryEvents.length === 0 || feature.materializerLanes.length === 0 || !feature.adminDebugVisibility.debugVisible) {
    return false;
  }
  return events.every((event) => feature.telemetryEvents.includes(event.eventName));
}

function sourcePathEvidence(events: readonly ActivitySourceEvent[]) {
  return events
    .map((event) => event.sourcePath)
    .filter((path): path is string => Boolean(path));
}

function isObservedActivityEvidence(event: ActivitySourceEvent) {
  return event.sourceKind === "source_backed_fixture";
}

function featureSourceFiles(feature: FeatureRegistration) {
  return [
    "src/lib/analytics/activity-verification-engine.ts",
    "src/lib/features/feature-registration-registry.ts",
    ...feature.routes.slice(0, 2).map((route) => route.path),
  ];
}

function backlogItem(
  feature: FeatureRegistration,
  status: ActivityVerificationStatus,
  title: string,
  evidenceReason: string,
  nextAction: string,
): DebugBacklogItem {
  return {
    id: `activity-verification-${feature.featureId}-${status}`,
    title,
    owner: feature.owner,
    surface: feature.uiSurfaces[0] ?? feature.featureId,
    severity: status === "missing_tracking" ? "p1" : "p2",
    source: "telemetry",
    status: "open",
    fixClass: "telemetry_closure",
    scoreDimensionImpact: feature.scoreDimensionsAffected,
    scoreImpact: status === "missing_tracking" ? 4 : 2,
    sourceFiles: featureSourceFiles(feature),
    sourceRoute: feature.routes[0]?.path ?? "src/lib/features/feature-registration-registry.ts",
    evidenceStatus: status === "blocked_by_consent" ? "source_backed" : "missing",
    evidenceReason,
    exactNextAction: nextAction,
    sourceMessage: `Activity verification ${status} for ${feature.featureId}.`,
    sourceValidator: "npm run check:activity-verification-engine",
  };
}

function buildBacklogItems(feature: FeatureRegistration, verification: FeatureActivityVerification): DebugBacklogItem[] {
  if (verification.verificationStatus === "missing_tracking") {
    return [backlogItem(
      feature,
      "missing_tracking",
      `${feature.featureId} activity missing tracking registration`,
      "Feature activity cannot be verified because telemetry events, materializer lanes, or debug visibility are missing.",
      "Register telemetry events, materializer lane, and debug owner before treating the feature path as complete.",
    )];
  }
  if (verification.verificationStatus === "blocked_by_consent") {
    return [backlogItem(
      feature,
      "blocked_by_consent",
      `${feature.featureId} activity blocked by consent mode`,
      `Consent mode does not allow the feature activity path; consent mismatch must stay visible instead of being counted.`,
      "Keep behavior suppressed under the selected consent mode or upgrade only through an explicit consent decision.",
    )];
  }
  if (verification.verificationStatus === "orphaned") {
    return [backlogItem(
      feature,
      "orphaned",
      `${feature.featureId} activity materializer missing`,
      "Activity exists but does not have a complete identity, materializer, debug, and score path.",
      "Connect the activity to a materializer/debug consumer or classify it as source-ready only.",
    )];
  }
  return [];
}

function confidenceForStatus(status: ActivityVerificationStatus) {
  if (status === "verified_by_activity") return 86;
  if (status === "source_ready_no_activity") return 58;
  if (status === "orphaned") return 28;
  if (status === "blocked_by_consent") return 18;
  if (status === "missing_tracking") return 8;
  return 4;
}

function verifyFeature(feature: FeatureRegistration, events: readonly ActivitySourceEvent[], defaultConsentMode: ConsentMode): FeatureActivityVerification {
  const relevantEvents = eventsForFeature(feature, events);
  const activityEvents = relevantEvents.filter(isObservedActivityEvidence);
  const eventConsentModes = relevantEvents.map((event) => normalizeConsentMode(event.consentMode ?? defaultConsentMode));
  const consentMode = eventConsentModes[0] ?? defaultConsentMode;
  const trackingComplete = hasTracking(feature, relevantEvents);
  const hasActivity = activityEvents.length > 0;
  const hasLegacyUnknown = relevantEvents.some((event) => event.sourceKind === "unknown_legacy");
  const guestActivitySeen = activityEvents.some((event) => Boolean(event.guestId));
  const userActivitySeen = activityEvents.some((event) => Boolean(event.userId));
  const guestToUserLinked = activityEvents.some((event) => Boolean(event.guestId && event.userId && event.identityLinkId));
  const identifiableMetricAvailable = activityEvents.some((event) =>
    Boolean(event.userId)
    && Number(event.identityConfidence ?? (event.identityLinkId ? 0.8 : 0)) >= 0.8,
  );
  const behaviorMaterialized = activityEvents.some((event) => event.materialized === true)
    && feature.materializerLanes.length > 0;
  const debugVisible = feature.adminDebugVisibility.debugVisible
    && (relevantEvents.length === 0 || relevantEvents.some((event) => event.debugVisible !== false));
  const consentModeAllowed = feature.consentModeRequirements.every((requirement) =>
    consentRequirementAllowed(requirement, consentMode),
  );

  let verificationStatus: ActivityVerificationStatus;
  if (hasLegacyUnknown) {
    verificationStatus = "unknown_legacy";
  } else if (!trackingComplete) {
    verificationStatus = "missing_tracking";
  } else if (hasActivity && !consentModeAllowed) {
    verificationStatus = "blocked_by_consent";
  } else if (hasActivity && (!behaviorMaterialized || !debugVisible || (userActivitySeen && !identifiableMetricAvailable))) {
    verificationStatus = "orphaned";
  } else if (hasActivity) {
    verificationStatus = "verified_by_activity";
  } else {
    verificationStatus = "source_ready_no_activity";
  }

  const scoreEligible = verificationStatus === "verified_by_activity"
    && behaviorMaterialized
    && debugVisible
    && consentModeAllowed
    && (!userActivitySeen || identifiableMetricAvailable);

  return {
    featureId: feature.featureId,
    owner: feature.owner,
    guestActivitySeen,
    userActivitySeen,
    guestToUserLinked,
    identifiableMetricAvailable,
    consentModeAllowed,
    behaviorMaterialized,
    debugVisible,
    scoreEligible,
    verificationStatus,
    confidenceScore: scoreEligible ? confidenceForStatus(verificationStatus) : Math.min(confidenceForStatus(verificationStatus), 58),
    evidence: [
      `telemetryEvents=${feature.telemetryEvents.length}`,
      `materializerLanes=${feature.materializerLanes.length}`,
      `debugVisible=${debugVisible}`,
      `consentMode=${consentMode}`,
      `activityEvents=${activityEvents.length}`,
      `relevantEvents=${relevantEvents.length}`,
      ...sourcePathEvidence(relevantEvents).map((path) => `sourcePath=${path}`),
    ],
    nextAction: verificationStatus === "verified_by_activity"
      ? "Use this as source-backed activity confidence only; keep deployed route, provider-backed site activity, and admin source evidence gates separate."
      : verificationStatus === "source_ready_no_activity"
        ? "Producer, materializer, debug, and score paths are source-ready; wait for real future activity without dragging runtime, evidence, or freshness."
        : "Resolve the surfaced activity verification backlog item before counting this feature path.",
  };
}

function summary(features: readonly FeatureActivityVerification[]) {
  const counts = Object.fromEntries(STATUS_COUNTS.map((status) => [
    status,
    features.filter((feature) => feature.verificationStatus === status).length,
  ])) as Record<ActivityVerificationStatus, number>;
  return {
    totalFeatures: features.length,
    verifiedByActivity: counts.verified_by_activity,
    sourceReadyNoActivity: counts.source_ready_no_activity,
    blockedByConsent: counts.blocked_by_consent,
    missingTracking: counts.missing_tracking,
    orphaned: counts.orphaned,
    unknownLegacy: counts.unknown_legacy,
  };
}

export function validateActivityVerificationReport(report: ActivityVerificationReport) {
  const failures: string[] = [];

  if (report.productionReadsRequired) failures.push("activity verification must not require production reads.");
  if (report.legacyMutationAllowed) failures.push("activity verification must not mutate legacy data.");
  if (report.fakeActivityUsed) failures.push("activity verification report must not use fake activity.");
  if (
    report.formalGateImpact.clearsFormalProvider
    || report.formalGateImpact.clearsDeployedRuntime
    || report.formalGateImpact.clearsFormalAdminTruth
  ) {
    failures.push("activity verification must not clear deployed route, provider-backed site activity, or admin source evidence gates.");
  }

  for (const feature of report.features) {
    if (feature.verificationStatus === "verified_by_activity") {
      if (!feature.consentModeAllowed || !feature.behaviorMaterialized || !feature.debugVisible || !feature.scoreEligible) {
        failures.push(`${feature.featureId} verified without telemetry/materializer/debug/score path.`);
      }
    }
    if (feature.guestActivitySeen && feature.userActivitySeen && !feature.guestToUserLinked) {
      failures.push(`${feature.featureId} ignores guest-to-user link.`);
    }
    if (!feature.consentModeAllowed && feature.scoreEligible) {
      failures.push(`${feature.featureId} consent mismatch is score eligible.`);
    }
    if (feature.userActivitySeen && feature.scoreEligible && !feature.identifiableMetricAvailable) {
      failures.push(`${feature.featureId} user-level metric exists without identity confidence.`);
    }
    if (feature.verificationStatus === "missing_tracking"
      && !report.debugBacklogItems.some((item) => item.id.includes(`${feature.featureId}-missing_tracking`))) {
      failures.push(`missing tracking feature ${feature.featureId} did not create a debug backlog item.`);
    }
  }

  return failures;
}

export function buildActivityVerificationReport(input: ActivityVerificationInput = {}): ActivityVerificationReport {
  const consentMode = normalizeConsentMode(input.consentMode ?? "full_behavioral");
  const features = (input.features ?? FEATURE_REGISTRATION_REGISTRY).map((feature) =>
    verifyFeature(feature, input.sourceEvents ?? [], consentMode),
  );
  const featureById = Object.fromEntries((input.features ?? FEATURE_REGISTRATION_REGISTRY).map((feature) => [feature.featureId, feature]));
  const debugBacklogItems = features.flatMap((feature) => buildBacklogItems(featureById[feature.featureId], feature));
  const fakeActivityUsed = (input.sourceEvents ?? []).some((event) => event.sourceKind === "fake");
  const baseReport: ActivityVerificationReport = {
    reportKey: "activity-verification-engine",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeActivityUsed,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    features,
    debugBacklogItems,
    summary: summary(features),
    validationFailures: [],
  };
  const validationFailures = validateActivityVerificationReport(baseReport);
  return {
    ...baseReport,
    status: validationFailures.length > 0 ? "fail" : "pass",
    validationFailures,
  };
}
