import {
  PERSON_METRIC_DEFINITIONS,
  type PersonMetricId,
} from "@/lib/analytics/person-metrics-contract";
import type { PersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";

export const INDIVIDUAL_USER_METRIC_TRUTH_VERSION = "2026.05.individual-user-metrics.1";

export type UserMetricHydrationStatus = "hydrated" | "collecting" | "source_missing" | "bridge_missing" | "materializer_missing" | "permission_blocked" | "proven_zero";

export interface IndividualUserMetricTruth {
  metricId: string;
  sourceEvents: string[];
  sourceFact: string;
  identityRequirement: "guest_or_session" | "signed_in_user" | "linked_person" | "creator_role" | "server_exact";
  countScope: "global_and_user" | "user_only" | "linked_person" | "creator_role";
  dedupeRule: string;
  confidenceRule: string;
  provenZeroRule: string;
  displayRule: string;
  debugFailureReason: "missingProducer" | "missingBridge" | "materializer_missing" | "permission_blocked" | "global_only_not_user_proof";
  panelHydrationMapping: string;
}

const REQUIREMENT_BY_ID: Partial<Record<PersonMetricId, IndividualUserMetricTruth["identityRequirement"]>> = {
  payment_approvals: "server_exact",
  drop_unlocks: "server_exact",
  unwraps: "server_exact",
  runtime_watch_sessions: "linked_person",
  creator_drop_manager_actions: "creator_role",
};

export const INDIVIDUAL_USER_METRIC_TRUTH: IndividualUserMetricTruth[] = PERSON_METRIC_DEFINITIONS.map((metric) => ({
  metricId: metric.id,
  sourceEvents: metric.eventNames,
  sourceFact: metric.sourceOfTruth,
  identityRequirement: REQUIREMENT_BY_ID[metric.id] ?? "guest_or_session",
  countScope: metric.aggregation.linkedPerson.enabled ? "global_and_user" : "user_only",
  dedupeRule: `${metric.aggregation.global.doubleCountPolicy}; linked=${metric.aggregation.linkedPerson.doubleCountPolicy}`,
  confidenceRule: `minimum=${metric.identityConfidence.minimum}; globalMinimum=${metric.identityConfidence.globalMinimum}`,
  provenZeroRule: "Zero is displayable only when provenZero=true for a bounded source window.",
  displayRule: "Missing individual user data is not zero; show collecting/source_missing/bridge_missing/materializer_missing/permission_blocked.",
  debugFailureReason: "global_only_not_user_proof",
  panelHydrationMapping: metric.materializer,
}));

export interface IndividualUserMetricStatus {
  metricId: PersonMetricId;
  globalCount: number;
  guestCount: number;
  signedInCount: number;
  linkedPersonCount: number;
  creatorRoleCount: number;
  userHydrationStatus: UserMetricHydrationStatus;
  globalOnlyMismatch: boolean;
  displayRule: string;
  debugFailureReason: string | null;
}

export interface IndividualUserMetricTruthReport {
  reportKey: "individual-user-metric-truth";
  status: "pass" | "review" | "classified";
  metricStatus: Record<PersonMetricId, IndividualUserMetricStatus>;
  globalVsUserMismatchCount: number;
  activeGlobalVsUserMismatchCount: number;
  classifiedNonBlockingMismatchCount: number;
  expectedNoUserMappingCount: number;
  missingIdentityLinkCount: number;
  unsafeUnknownMismatchCount: number;
  duplicateSuppressionCount: number;
  validationFailures: string[];
}

export function resolveIndividualUserMetricHydrationStatus(input: {
  globalCount: number;
  userCount: number;
  provenZero: boolean;
  missingProducer: string | null;
  missingBridge: string | null;
  explicitState?: UserMetricHydrationStatus | null;
}): UserMetricHydrationStatus {
  if (input.explicitState) return input.explicitState;
  if (input.userCount > 0) return "hydrated";
  if (input.provenZero) return "proven_zero";
  if (input.globalCount > 0) return "bridge_missing";
  if (input.missingBridge) return "materializer_missing";
  if (input.missingProducer) return "source_missing";
  return "collecting";
}

export function buildIndividualUserMetricTruthReport(report: PersonMetricsHydrationReport): IndividualUserMetricTruthReport {
  const metricStatus = PERSON_METRIC_DEFINITIONS.reduce<Record<PersonMetricId, IndividualUserMetricStatus>>((output, metric) => {
    const global = report.scopes.global.metrics[metric.id];
    const guest = report.scopes.guest.metrics[metric.id];
    const signedIn = report.scopes.signedIn.metrics[metric.id];
    const linked = report.scopes.linkedPerson.metrics[metric.id];
    const creator = report.scopes.creatorRole.metrics[metric.id];
    const userCount = guest.count + signedIn.count + linked.count + creator.count;
    const computedUserHydrationStatus = resolveIndividualUserMetricHydrationStatus({
      globalCount: global.count,
      userCount,
      provenZero: global.provenZero,
      missingProducer: report.metricStatus[metric.id].missingProducer,
      missingBridge: report.metricStatus[metric.id].missingBridge,
    });
    const userHydrationStatus = global.count > 0 && userCount === 0
      ? "bridge_missing"
      : report.userParityStatus?.[metric.id]?.state ?? computedUserHydrationStatus;
    output[metric.id] = {
      metricId: metric.id,
      globalCount: global.count,
      guestCount: guest.count,
      signedInCount: signedIn.count,
      linkedPersonCount: linked.count,
      creatorRoleCount: creator.count,
      userHydrationStatus,
      globalOnlyMismatch: global.count > 0 && userCount === 0,
      displayRule: userHydrationStatus === "proven_zero"
        ? "Display zero because a bounded source window proved zero."
        : "Missing user data is not zero; show the user-level source state.",
      debugFailureReason: global.count > 0 && userCount === 0 ? "global_only_not_user_proof" : null,
    };
    return output;
  }, {} as Record<PersonMetricId, IndividualUserMetricStatus>);

  const globalVsUserMismatchCount = Object.values(metricStatus).filter((metric) => metric.globalOnlyMismatch).length;
  
  const classifiedMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch && ["visits", "active_days", "page_views"].includes(metric.metricId));
  const classifiedNonBlockingMismatchCount = classifiedMismatches.length;
  const expectedNoUserMappingCount = classifiedMismatches.length;

  const unsafeUnknownMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch && !["visits", "active_days", "page_views"].includes(metric.metricId));
  const unsafeUnknownMismatchCount = unsafeUnknownMismatches.length;
  const activeGlobalVsUserMismatchCount = unsafeUnknownMismatchCount;
  
  const missingIdentityLinkCount = activeGlobalVsUserMismatchCount > 0 ? 1 : 0;

  const hasOnlyClassifiedMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch)
    .every((metric) => ["visits", "active_days", "page_views"].includes(metric.metricId));

  return {
    reportKey: "individual-user-metric-truth",
    status: globalVsUserMismatchCount === 0 ? "pass" : hasOnlyClassifiedMismatches ? "classified" : "review",
    metricStatus,
    globalVsUserMismatchCount,
    activeGlobalVsUserMismatchCount,
    classifiedNonBlockingMismatchCount,
    expectedNoUserMappingCount,
    missingIdentityLinkCount,
    unsafeUnknownMismatchCount,
    duplicateSuppressionCount: report.validation.duplicateGuestUserCountsSuppressed,
    validationFailures: (globalVsUserMismatchCount > 0 && !hasOnlyClassifiedMismatches)
      ? [`${globalVsUserMismatchCount} metric(s) have unclassified global-only hydration without user-level proof.`]
      : [],
  };
}

export function validateIndividualUserMetricTruth() {
  const failures: string[] = [];
  for (const metric of INDIVIDUAL_USER_METRIC_TRUTH) {
    if (metric.sourceEvents.length === 0) failures.push(`${metric.metricId} lacks source events.`);
    if (!metric.identityRequirement) failures.push(`${metric.metricId} lacks identity requirement.`);
    if (!metric.dedupeRule) failures.push(`${metric.metricId} lacks dedupe rule.`);
    if (!metric.provenZeroRule.includes("provenZero")) failures.push(`${metric.metricId} lacks provenZero rule.`);
  }
  return failures;
}
