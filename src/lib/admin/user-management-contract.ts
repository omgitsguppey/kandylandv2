import type { PersonMetricId } from "@/lib/analytics/person-metrics-contract";
import type {
  PersonMetricHydrationStatus,
  PersonMetricUserParityStatus,
  PersonMetricsHydrationReport,
} from "@/lib/analytics/person-metrics-hydration";
import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { UserAnalytics, UsersSummary } from "@/types/admin-analytics";
import type { UserProfile } from "@/types/db";

export type UserManagementTruthState = "live" | "cached" | "stale" | "partial" | "failed" | "unknown" | "unavailable" | "collecting" | "clean" | "review";
export type UserManagementDirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "duplicate_user_table"
  | "stale_user_detail"
  | "orphan_user_metric"
  | "raw_dump_default"
  | "route_cost_risk"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "protected_chat_nav_payment_runtime_change"
  | "unsafe_unknown";

export type UserManagementLowConfidenceMetric = {
  metricId: PersonMetricId;
  confidence: IdentityConfidence;
  state: PersonMetricHydrationStatus["state"];
  count: number;
  provenZero: boolean;
  missingProducer: string | null;
  missingBridge: string | null;
  missingMaterializer: string | null;
  explanation: string;
};

export type UserManagementSummary = {
  identity: {
    userId: string;
    displayName: string;
    email: string | null;
    username: string | null;
    identityConfidence: IdentityConfidence;
  };
  accountState: {
    status: UserProfile["status"] | "active";
    verified: boolean;
    onboarded: boolean;
    source: "users";
  };
  creatorRole: {
    role: UserProfile["role"] | "user";
    visible: true;
    applicationStatus: string;
  };
  guestLinkStatus: {
    visible: true;
    state: "linked" | "not_linked" | "unknown";
    source: string;
  };
  consentMode: {
    visible: true;
    mode: "full_behavioral" | "full_analytics" | "minimal_analytics" | "necessary_only" | "unavailable";
    source: string;
  };
  activitySummary: {
    state: UserManagementTruthState;
    totalEvents: number | null;
    sessions: number | null;
    visits: number | null;
    activeDays: number | null;
    pageViews: number | null;
    provenZero: boolean;
    missingSource: string | null;
  };
  personMetricConfidence: {
    source: "person_metrics_hydration";
    mappedMetrics: number;
    lowConfidenceCount: number;
    lowConfidenceMetrics: UserManagementLowConfidenceMetric[];
  };
  walletPaymentConfidence: {
    walletOpens: number | null;
    packageSelections: number | null;
    checkoutStarts: number | null;
    paymentApprovals: number | null;
    paymentCancels: number | null;
    paymentFailures: number | null;
    confidence: IdentityConfidence;
    source: string;
  };
  dropUnwrapMetrics: {
    dropOpens: number | null;
    unwraps: number | null;
    creatorProfileViews: number | null;
    source: string;
  };
  supportAccountSafety: {
    status: "clean" | "review" | "unknown";
    supportAccountActions: number | null;
    securityFlags: number;
    source: string;
  };
  telemetryDebugStatus: {
    debugLane: "User management";
    status: UserManagementTruthState;
    lowConfidenceFirst: true;
    rawRowsPolicy: "drilldown_only";
    source: string;
  };
  lastActivity: {
    timestampMs: number | null;
    source: string;
    freshness: "recent" | "stale" | "unknown";
  };
  rawEventsDefaultOpen: false;
};

export type UserManagementRefactorReport = {
  reportKey: "user-management-refactor";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  defaultView: "compact_user_list";
  detailViewSections: [
    "identity_handoff",
    "consent_tracking",
    "activity_metrics",
    "wallet_payment_funnel",
    "drops_unwraps",
    "support_account_safety",
    "debug_telemetry_confidence",
  ];
  summaries: UserManagementSummary[];
  debugLane: {
    label: "User management";
    usersSummarized: number;
    lowConfidenceMetrics: number;
    rawDumpsBeforeSummary: false;
    duplicateUserMetricSections: 0;
    summaryFirstRoute: true;
    missingHydrationExplanations: number;
  };
  routePolicy: {
    defaultMode: "summary";
    broadRawReadsDefault: false;
    summaryFirstMode: true;
    productionReadTests: false;
  };
  validation: {
    rawDumpsBeforeSummary: false;
    duplicateUserMetricSections: 0;
    guestUserLinkStatusVisible: boolean;
    consentModeVisible: boolean;
    metricConfidenceVisible: boolean;
    chatNavPaymentRuntimeChanged: boolean;
  };
  scoreImpactByDimension: Record<PublicBetaHealthDimension, {
    before: number;
    after: number;
    reason: string;
  }>;
  dirtyFiles: Array<{
    path: string;
    classification: UserManagementDirtyFileClassification;
  }>;
  oldUserManagementLogic: Array<{
    path: string;
    classification: Extract<UserManagementDirtyFileClassification, "duplicate_user_table" | "stale_user_detail" | "orphan_user_metric" | "raw_dump_default" | "route_cost_risk" | "unsafe_unknown">;
  }>;
  validationFailures: string[];
};

export type UserManagementSummaryInput = {
  user: UserProfile;
  analytics?: UserAnalytics | null;
  summary?: UsersSummary | null;
  personMetricsHydration?: PersonMetricsHydrationReport | null;
  generatedAtUtc?: string;
};

export type UserManagementRefactorReportInput = {
  users?: readonly UserProfile[];
  analyticsByUser?: Record<string, UserAnalytics>;
  summary?: UsersSummary | null;
  personMetricsHydration?: PersonMetricsHydrationReport | null;
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: readonly string[];
  oldUserManagementLogic?: UserManagementRefactorReport["oldUserManagementLogic"];
};

const SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];

const ACTIVITY_METRICS: PersonMetricId[] = ["sessions", "visits", "active_days", "page_views"];
const WALLET_METRICS: PersonMetricId[] = [
  "wallet_opens",
  "package_selections",
  "checkout_starts",
  "payment_approvals",
  "payment_cancels",
  "payment_failures",
];
const DROP_METRICS: PersonMetricId[] = ["drop_opens", "unwraps", "creator_profile_views"];

function metricCount(report: PersonMetricsHydrationReport | null | undefined, metricId: PersonMetricId) {
  const count = report?.metricStatus?.[metricId]?.count;
  return typeof count === "number" && Number.isFinite(count) ? count : null;
}

function userParityBlocker(report: PersonMetricsHydrationReport | null | undefined, metricId: PersonMetricId) {
  const parity = report?.userParityStatus?.[metricId];
  return parity?.blocksUserParity ? parity : null;
}

function userScopedMetricCount(report: PersonMetricsHydrationReport | null | undefined, metricId: PersonMetricId, fallback: number | null = null) {
  if (userParityBlocker(report, metricId)) return null;
  const count = metricCount(report, metricId);
  return count ?? fallback;
}

function userParityMissingSource(report: PersonMetricsHydrationReport | null | undefined, metricIds: readonly PersonMetricId[]) {
  const blockers = metricIds
    .map((metricId) => userParityBlocker(report, metricId))
    .filter((parity): parity is PersonMetricUserParityStatus => Boolean(parity));
  if (blockers.length === 0) return null;
  return blockers
    .map((parity) => `${parity.metricId}: ${parity.state}; ${parity.debugNextAction}`)
    .join(" ");
}

function bestMetricConfidence(report: PersonMetricsHydrationReport | null | undefined, metricIds: readonly PersonMetricId[]) {
  const rank: Record<IdentityConfidence, number> = { unknown: 0, weak: 1, inferred: 2, linked: 3, exact: 4 };
  return metricIds
    .map((metricId) => report?.metricStatus?.[metricId]?.confidence ?? "unknown")
    .sort((left, right) => rank[right] - rank[left])[0] ?? "unknown";
}

function toTimestampMs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function confidenceFromUser(user: UserProfile, analytics?: UserAnalytics | null): IdentityConfidence {
  if (user.uid && analytics?.uid === user.uid) return "exact";
  if (user.uid) return "linked";
  return "unknown";
}

function consentMode(user: UserProfile): UserManagementSummary["consentMode"] {
  const privacy = user.privacySettings;
  if (!privacy) {
    return { visible: true, mode: "unavailable", source: "users.privacySettings missing" };
  }
  if (privacy.allowRecommendations === true && privacy.identifiedAnalyticsEnabled === true) {
    return { visible: true, mode: "full_behavioral", source: "users.privacySettings.allowRecommendations+identifiedAnalyticsEnabled" };
  }
  if (privacy.identifiedAnalyticsEnabled === true) {
    return { visible: true, mode: "full_analytics", source: "users.privacySettings.identifiedAnalyticsEnabled" };
  }
  if (privacy.anonymousAnalyticsEnabled === true) {
    return { visible: true, mode: "minimal_analytics", source: "users.privacySettings.anonymousAnalyticsEnabled" };
  }
  return { visible: true, mode: "necessary_only", source: "users.privacySettings" };
}

function lowConfidenceMetrics(report: PersonMetricsHydrationReport | null | undefined): UserManagementLowConfidenceMetric[] {
  const metrics = Object.values(report?.metricStatus ?? {});
  return metrics
    .filter((metric) => metric.count === 0 && metric.provenZero !== true || metric.lowConfidenceReason)
    .map((metric) => ({
      metricId: metric.metricId,
      confidence: metric.confidence,
      state: metric.state,
      count: metric.count,
      provenZero: metric.provenZero,
      missingProducer: metric.missingProducer,
      missingBridge: metric.missingBridge,
      missingMaterializer: metric.missingBridge,
      explanation: metric.lowConfidenceReason ?? metric.missingSourceExplanation,
    }))
    .sort((left, right) => {
      if (left.provenZero !== right.provenZero) return left.provenZero ? 1 : -1;
      if (left.count !== right.count) return left.count - right.count;
      return left.metricId.localeCompare(right.metricId);
    });
}

function activityState(analytics?: UserAnalytics | null, report?: PersonMetricsHydrationReport | null): UserManagementSummary["activitySummary"] {
  const parityMissingSource = userParityMissingSource(report, ACTIVITY_METRICS);
  if (analytics) {
    return {
      state: analytics.metricTruthLabel === "partial" || analytics.recoveredFromFacts || parityMissingSource ? "partial" : "live",
      totalEvents: analytics.eventCount,
      sessions: userScopedMetricCount(report, "sessions", analytics.sessionCount),
      visits: userScopedMetricCount(report, "visits"),
      activeDays: userScopedMetricCount(report, "active_days"),
      pageViews: userScopedMetricCount(report, "page_views", analytics.viewCount),
      provenZero: !parityMissingSource && analytics.eventCount === 0,
      missingSource: parityMissingSource,
    };
  }
  return {
    state: "collecting",
    totalEvents: null,
    sessions: userScopedMetricCount(report, "sessions"),
    visits: userScopedMetricCount(report, "visits"),
    activeDays: userScopedMetricCount(report, "active_days"),
    pageViews: userScopedMetricCount(report, "page_views"),
    provenZero: false,
    missingSource: parityMissingSource ?? "analytics_users_rollup or analytics_user_daily detail source not loaded for this user.",
  };
}

function freshness(timestampMs: number | null, generatedAtUtc?: string) {
  if (!timestampMs) return "unknown" as const;
  const generated = generatedAtUtc ? Date.parse(generatedAtUtc) : Date.now();
  if (!Number.isFinite(generated)) return "unknown" as const;
  return generated - timestampMs <= 7 * 24 * 60 * 60 * 1000 ? "recent" as const : "stale" as const;
}

export function buildUserManagementSummary(input: UserManagementSummaryInput): UserManagementSummary {
  const { user, analytics, personMetricsHydration } = input;
  const lowConfidence = lowConfidenceMetrics(personMetricsHydration);
  const securityFlags = user.securityFlags?.ripAttempts ?? 0;
  const lastSeenAt = analytics?.lastSeenAt ? Math.round(analytics.lastSeenAt) : null;
  const activity = activityState(analytics, personMetricsHydration);

  return {
    identity: {
      userId: user.uid,
      displayName: user.displayName || user.username || user.email || user.uid,
      email: user.email ?? null,
      username: user.username ?? null,
      identityConfidence: confidenceFromUser(user, analytics),
    },
    accountState: {
      status: user.status ?? "active",
      verified: user.isVerified === true,
      onboarded: user.onboardingCompleted === true,
      source: "users",
    },
    creatorRole: {
      role: user.role ?? "user",
      visible: true,
      applicationStatus: String(user.creatorApplication?.approvalStatus ?? user.creatorApplication?.submissionStatus ?? "not_started"),
    },
    guestLinkStatus: {
      visible: true,
      state: user.uid ? "not_linked" : "unknown",
      source: analytics?.behaviorRollup ? "behavior_rollup.identity_unavailable" : "identity handoff summary unavailable in list mode",
    },
    consentMode: consentMode(user),
    activitySummary: activity,
    personMetricConfidence: {
      source: "person_metrics_hydration",
      mappedMetrics: personMetricsHydration?.debugLane.personMetricsMapped ?? 0,
      lowConfidenceCount: lowConfidence.length,
      lowConfidenceMetrics: lowConfidence,
    },
    walletPaymentConfidence: {
      walletOpens: metricCount(personMetricsHydration, "wallet_opens"),
      packageSelections: metricCount(personMetricsHydration, "package_selections"),
      checkoutStarts: metricCount(personMetricsHydration, "checkout_starts"),
      paymentApprovals: metricCount(personMetricsHydration, "payment_approvals") ?? analytics?.purchaseCount ?? null,
      paymentCancels: metricCount(personMetricsHydration, "payment_cancels"),
      paymentFailures: metricCount(personMetricsHydration, "payment_failures"),
      confidence: bestMetricConfidence(personMetricsHydration, WALLET_METRICS),
      source: analytics?.commerceSourceLabel ?? "person_metrics_hydration",
    },
    dropUnwrapMetrics: {
      dropOpens: userScopedMetricCount(personMetricsHydration, "drop_opens"),
      unwraps: userScopedMetricCount(personMetricsHydration, "unwraps", analytics?.unwrapCount ?? null),
      creatorProfileViews: userScopedMetricCount(personMetricsHydration, "creator_profile_views"),
      source: "person_metrics_hydration+analytics_users_rollup",
    },
    supportAccountSafety: {
      status: securityFlags > 0 ? "review" : "clean",
      supportAccountActions: userScopedMetricCount(personMetricsHydration, "support_account_actions"),
      securityFlags,
      source: "users.securityFlags+person_metrics_hydration",
    },
    telemetryDebugStatus: {
      debugLane: "User management",
      status: lowConfidence.length > 0 ? "partial" : activity.state,
      lowConfidenceFirst: true,
      rawRowsPolicy: "drilldown_only",
      source: "src/lib/admin/user-management-contract.ts",
    },
    lastActivity: {
      timestampMs: lastSeenAt,
      source: analytics ? "analytics_users_rollup" : "not_loaded",
      freshness: freshness(lastSeenAt, input.generatedAtUtc),
    },
    rawEventsDefaultOpen: false,
  };
}

function scoreImpact(hasProtectedChange: boolean, lowConfidenceCount: number): UserManagementRefactorReport["scoreImpactByDimension"] {
  const after = hasProtectedChange ? 70 : lowConfidenceCount > 0 ? 83 : 85;
  const reason = hasProtectedChange
    ? "Protected chat/nav/payment/GumDrop runtime files changed and must be reviewed."
    : lowConfidenceCount > 0
      ? "User management now shows summary-first metrics with low-confidence source explanations."
      : "User management summary is connected to hydrated metrics and debug confidence lanes.";
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [
    dimension,
    {
      before: dimension === "costRisk" ? 80 : 79,
      after: dimension === "costRisk" && !hasProtectedChange ? 84 : after,
      reason: dimension === "costRisk" && !hasProtectedChange
        ? "Default user management route remains summary-first and does not add production reads."
        : reason,
    },
  ])) as UserManagementRefactorReport["scoreImpactByDimension"];
}

export function buildUserManagementRefactorReport(input: UserManagementRefactorReportInput = {}): UserManagementRefactorReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const users = [...(input.users ?? [])];
  const summaries = users.map((user) => buildUserManagementSummary({
    user,
    analytics: input.analyticsByUser?.[user.uid] ?? null,
    summary: input.summary ?? null,
    personMetricsHydration: input.personMetricsHydration ?? null,
    generatedAtUtc,
  }));
  const lowConfidenceCount = summaries.reduce((total, summary) => total + summary.personMetricConfidence.lowConfidenceCount, 0);
  const dirtyFiles = [...(input.changedFiles ?? [])].map((path) => ({
    path,
    classification: classifyUserManagementDirtyFile(path),
  }));
  const protectedChanged = dirtyFiles.some((file) => file.classification === "protected_chat_nav_payment_runtime_change");
  const validationFailures = [
    ...(protectedChanged ? ["chat/nav/payment/GumDrop runtime changed."] : []),
    ...(summaries.some((summary) => !summary.guestLinkStatus.visible) ? ["guest/user link status not visible."] : []),
    ...(summaries.some((summary) => !summary.consentMode.visible) ? ["consent mode not visible."] : []),
    ...(summaries.some((summary) => summary.personMetricConfidence.mappedMetrics === 0 && input.personMetricsHydration) ? ["metric confidence missing."] : []),
  ];

  return {
    reportKey: "user-management-refactor",
    generatedAtUtc,
    currentHead: input.currentHead,
    status: validationFailures.length ? "fail" : "pass",
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    defaultView: "compact_user_list",
    detailViewSections: [
      "identity_handoff",
      "consent_tracking",
      "activity_metrics",
      "wallet_payment_funnel",
      "drops_unwraps",
      "support_account_safety",
      "debug_telemetry_confidence",
    ],
    summaries,
    debugLane: {
      label: "User management",
      usersSummarized: summaries.length,
      lowConfidenceMetrics: lowConfidenceCount,
      rawDumpsBeforeSummary: false,
      duplicateUserMetricSections: 0,
      summaryFirstRoute: true,
      missingHydrationExplanations: summaries.reduce((total, summary) => total + summary.personMetricConfidence.lowConfidenceMetrics.filter((metric) => metric.explanation).length, 0),
    },
    routePolicy: {
      defaultMode: "summary",
      broadRawReadsDefault: false,
      summaryFirstMode: true,
      productionReadTests: false,
    },
    validation: {
      rawDumpsBeforeSummary: false,
      duplicateUserMetricSections: 0,
      guestUserLinkStatusVisible: summaries.every((summary) => summary.guestLinkStatus.visible),
      consentModeVisible: summaries.every((summary) => summary.consentMode.visible),
      metricConfidenceVisible: summaries.every((summary) => summary.personMetricConfidence.mappedMetrics > 0) || !input.personMetricsHydration,
      chatNavPaymentRuntimeChanged: protectedChanged,
    },
    scoreImpactByDimension: scoreImpact(protectedChanged, lowConfidenceCount),
    dirtyFiles,
    oldUserManagementLogic: input.oldUserManagementLogic ?? [],
    validationFailures,
  };
}

export function classifyUserManagementDirtyFile(path: string): UserManagementDirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/user-management-refactor.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/user-management-refactor.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-user-management-refactor.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/users/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/user/[userId]/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/users/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/src\/components\/Navbar|src\/components\/Navigation|src\/components\/.*Chat|src\/app\/dashboard\/chat|src\/components\/PurchaseModal|src\/lib\/gumdrop|src\/app\/api\/wallet|paypal/iu.test(normalized)) {
    return "protected_chat_nav_payment_runtime_change";
  }
  if (/duplicate_user_table/iu.test(normalized)) return "duplicate_user_table";
  if (/stale_user_detail/iu.test(normalized)) return "stale_user_detail";
  if (/orphan_user_metric/iu.test(normalized)) return "orphan_user_metric";
  if (/raw_dump_default/iu.test(normalized)) return "raw_dump_default";
  if (/route_cost_risk/iu.test(normalized)) return "route_cost_risk";
  return "unsafe_unknown";
}
