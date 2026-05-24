import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { UserProfile } from "@/types/db";
import type { UserAnalytics, UsersSummary } from "@/types/admin-analytics";
import type { PersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";
import {
  buildUserManagementRefactorReport,
  buildUserManagementSummary,
  classifyUserManagementDirtyFile,
} from "@/lib/admin/user-management-contract";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function user(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user_1",
    email: "fan@example.com",
    displayName: "Fan Example",
    username: "fan",
    photoURL: null,
    role: "creator",
    gumDropsBalance: 120,
    gumDropsPaidBalance: 80,
    gumDropsRewardBalance: 40,
    unlockedContent: ["drop_1"],
    createdAt: 1710000000000,
    status: "active",
    isVerified: true,
    onboardingCompleted: true,
    notificationSettings: {
      inAppEnabled: true,
      browserPushEnabled: true,
      newDropAlerts: true,
      expiringSoonAlerts: true,
    },
    privacySettings: {
      allowRecommendations: true,
      showInAnonymousStats: true,
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      globalPrivacyControl: false,
      honorGlobalPrivacyControl: true,
    },
    creatorApplication: {
      signupType: "creator",
      submissionStatus: "onboarding_submitted",
      approvalStatus: "creator_approved",
      queuePosition: 1,
      onboardingStartedAt: 1710000000000,
      submittedAt: 1710000000000,
      onboardingSubmittedAt: 1710000000000,
      awaitingManualReviewAt: 1710000000000,
      updatedAt: 1710000000000,
      creatorDisplayName: "Fan Example",
      creatorPrimaryPlatform: "instagram",
      creatorContentFocus: "behind the scenes",
      bypassFanOnboarding: false,
      legalStatus: "legal_signed",
      idVerificationStatus: "id_verified",
      segmentationStatus: "segment_assigned",
    },
    ...overrides,
  } as UserProfile;
}

function analytics(overrides: Partial<UserAnalytics> = {}): UserAnalytics {
  return {
    uid: "user_1",
    username: "fan",
    eventCount: 14,
    sessionCount: 3,
    viewCount: 8,
    engagedViewCount: 6,
    passiveViewCount: 2,
    bounceCount: 1,
    unwrapCount: 2,
    purchaseCount: 1,
    authSuccessCount: 2,
    onboardingStartCount: 1,
    onboardingCompletionCount: 1,
    watchSecondsTotal: 180,
    watchHours: 0.1,
    avgLoadMs: 220,
    lastSeenAt: 1710003600000,
    grossRevenueUsd: 9.99,
    grossRevenueCents: 999,
    adjustedProfitUsd: 8.77,
    adjustedProfitCents: 877,
    retailValueUsd: 12,
    bonusValueUsd: 2,
    bonusGumDrops: 20,
    deliveredGumDrops: 120,
    paidGumDrops: 100,
    averageOrderUsd: 9.99,
    effectiveUsdPer100Gd: 8.33,
    unlockSpendGdTotal: 40,
    lastPurchaseAt: 1710002400000,
    bundleYieldRatio: 0.83,
    commerceTruthLabel: "live",
    commerceSourceLabel: "server purchase verification facts",
    metricTruthLabel: "live",
    metricSourceLabel: "canonical person metrics hydration",
    metricIntegrityFailures: [],
    recoveredFromFacts: false,
    ...overrides,
  };
}

function hydration(overrides: Partial<PersonMetricsHydrationReport> = {}): PersonMetricsHydrationReport {
  return {
    reportKey: "person-metrics-hydration",
    generatedAtUtc: "2026-05-23T12:00:00.000Z",
    status: "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeMetricsUsed: false,
    debugLane: {
      label: "Person metrics hydration",
      producersRegistered: 86,
      producersConnected: 24,
      eventEnvelopesHydrated: 33,
      globalMetricsHydrated: 24,
      guestMetricsHydrated: 2,
      signedInMetricsHydrated: 24,
      linkedPersonMetricsHydrated: 1,
      creatorRoleMetricsHydrated: 4,
      personMetricsMapped: 24,
      lowConfidenceMetrics: 1,
      gaps: 0,
    },
    metricStatus: {
      sessions: { metricId: "sessions", count: 3, confidence: "exact", provenZero: false, sourceEvents: ["session_started"], hydratedEventIds: ["session_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      visits: { metricId: "visits", count: 8, confidence: "exact", provenZero: false, sourceEvents: ["semantic_page_viewed"], hydratedEventIds: ["visit_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      active_days: { metricId: "active_days", count: 2, confidence: "linked", provenZero: false, sourceEvents: ["session_started"], hydratedEventIds: ["day_1"], suppressedDuplicateCount: 1, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: "active_days hydrated below exact confidence (linked).", missingProducer: null, missingBridge: null },
      page_views: { metricId: "page_views", count: 8, confidence: "exact", provenZero: false, sourceEvents: ["semantic_page_viewed"], hydratedEventIds: ["page_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_views: { metricId: "daily_task_views", count: 2, confidence: "exact", provenZero: false, sourceEvents: ["daily_task_surface_viewed", "daily_task_card_viewed"], hydratedEventIds: ["daily_task_view_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_starts: { metricId: "daily_task_starts", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["daily_task_started"], hydratedEventIds: ["daily_task_start_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_completions: { metricId: "daily_task_completions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["daily_task_completed"], hydratedEventIds: ["daily_task_completed_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_failures: { metricId: "daily_task_failures", count: 0, confidence: "unknown", provenZero: true, sourceEvents: ["daily_task_failed"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_rewards_granted: { metricId: "daily_task_rewards_granted", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["daily_task_reward_granted"], hydratedEventIds: ["daily_task_reward_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_average_duration: { metricId: "daily_task_average_duration", count: 4200, confidence: "inferred", provenZero: false, sourceEvents: ["daily_task_completed"], hydratedEventIds: ["daily_task_duration_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: "daily_task_average_duration hydrated below exact confidence (inferred).", missingProducer: null, missingBridge: null },
      daily_task_abandonments: { metricId: "daily_task_abandonments", count: 0, confidence: "unknown", provenZero: true, sourceEvents: ["daily_task_abandoned"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      daily_task_reset_locked_views: { metricId: "daily_task_reset_locked_views", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["daily_task_reset_locked", "daily_task_next_eligible_viewed"], hydratedEventIds: ["daily_task_locked_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      creator_profile_views: { metricId: "creator_profile_views", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_profile_viewed"], hydratedEventIds: ["profile_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      drop_opens: { metricId: "drop_opens", count: 3, confidence: "exact", provenZero: false, sourceEvents: ["drop_preview_opened"], hydratedEventIds: ["drop_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      unwraps: { metricId: "unwraps", count: 2, confidence: "exact", provenZero: false, sourceEvents: ["drop_unwrapped"], hydratedEventIds: ["unwrap_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      wallet_opens: { metricId: "wallet_opens", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["wallet_opened"], hydratedEventIds: ["wallet_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      wallet_closes: { metricId: "wallet_closes", count: 0, confidence: "unknown", provenZero: true, sourceEvents: ["wallet_closed_incomplete"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      package_selections: { metricId: "package_selections", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["purchase_package_selected"], hydratedEventIds: ["package_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      checkout_starts: { metricId: "checkout_starts", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["begin_checkout"], hydratedEventIds: ["checkout_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      payment_approvals: { metricId: "payment_approvals", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["server_purchase_verified"], hydratedEventIds: ["pay_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      payment_cancels: { metricId: "payment_cancels", count: 0, confidence: "unknown", provenZero: true, sourceEvents: ["payment_canceled"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      payment_failures: { metricId: "payment_failures", count: 0, confidence: "unknown", provenZero: true, sourceEvents: ["payment_failed"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      fan_pass_views: { metricId: "fan_pass_views", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_fan_pass_viewed"], hydratedEventIds: ["fan_pass_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      fan_pass_purchases: { metricId: "fan_pass_purchases", count: 0, confidence: "unknown", provenZero: false, sourceEvents: ["creator_fan_pass_started"], hydratedEventIds: [], suppressedDuplicateCount: 0, missingSourceExplanation: "Missing producer activity for fan_pass_purchases; expected producer event(s): creator_fan_pass_started.", state: "collecting", lowConfidenceReason: "Missing producer activity for fan_pass_purchases; expected producer event(s): creator_fan_pass_started.", missingProducer: "creator_fan_pass_started", missingBridge: "person_metrics.fan_pass_purchases" },
      broadcasts_viewed: { metricId: "broadcasts_viewed", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_broadcast_detail_viewed"], hydratedEventIds: ["broadcast_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      broadcasts_clicked: { metricId: "broadcasts_clicked", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_broadcast_cta_clicked"], hydratedEventIds: ["broadcast_click_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      follows: { metricId: "follows", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_followed"], hydratedEventIds: ["follow_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      notification_interactions: { metricId: "notification_interactions", count: 2, confidence: "exact", provenZero: false, sourceEvents: ["notification_opened"], hydratedEventIds: ["notification_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      runtime_watch_sessions: { metricId: "runtime_watch_sessions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["watch_session_started"], hydratedEventIds: ["watch_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      settings_actions: { metricId: "settings_actions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["setting_toggle_changed"], hydratedEventIds: ["settings_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      support_account_actions: { metricId: "support_account_actions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["support_ticket_created"], hydratedEventIds: ["support_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      chat_actions: { metricId: "chat_actions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["chat_message_sent"], hydratedEventIds: ["chat_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
      creator_drop_manager_actions: { metricId: "creator_drop_manager_actions", count: 1, confidence: "exact", provenZero: false, sourceEvents: ["creator_drop_submitted"], hydratedEventIds: ["creator_drop_1"], suppressedDuplicateCount: 0, missingSourceExplanation: "", state: "hydrated", lowConfidenceReason: null, missingProducer: null, missingBridge: null },
    },
    scopes: {} as PersonMetricsHydrationReport["scopes"],
    lowConfidenceMetrics: [],
    missingHydration: [],
    legacySummary: { candidatesReviewed: 0, candidatesHydrated: 0, exactPromotionsBlocked: 0, unknownLegacyArchived: 0 },
    validation: { checkoutStartCountsAsPaymentSuccess: false, pageTimeCountsAsWatchTime: false, duplicateGuestUserCountsSuppressed: 1, unknownLegacyBecameExact: false, zeroWithoutProvenZero: false },
    scoreImpactByDimension: {
      sourceHealth: { before: 79, after: 84, reason: "summary contract connects user management to hydrated metric source." },
      runtimeHealth: { before: 79, after: 83, reason: "summary route stays summary-first and bounded." },
      evidenceCompleteness: { before: 78, after: 84, reason: "low confidence metrics list missing source, bridge, and materializer." },
      freshness: { before: 79, after: 83, reason: "last activity source and freshness are visible." },
      costRisk: { before: 80, after: 84, reason: "default route avoids broad raw reads." },
      regressionRisk: { before: 79, after: 84, reason: "validator protects chat, nav, payment, and GumDrop runtime surfaces." },
    },
    ...overrides,
  };
}

function summary(): UsersSummary {
  return {
    totalUsers: 1,
    totalCreators: 1,
    totalAdmins: 0,
    verifiedUsers: 1,
    activeUsers: 1,
    suspendedUsers: 0,
    bannedUsers: 0,
    notificationsEnabledUsers: 1,
    onboardingCompletedUsers: 1,
    activeLast7Days: 1,
    returnedInLast7Days: 1,
    totalEvents: 14,
    totalUnwraps: 2,
    totalPurchases: 1,
    totalWatchHours: 0.1,
    grossRevenueUsd: 9.99,
    adjustedProfitUsd: 8.77,
    bonusValueUsd: 2,
    bonusGumDrops: 20,
    deliveredGumDrops: 120,
    paidGumDrops: 100,
    unlockSpendGdTotal: 40,
    averageOrderUsd: 9.99,
    effectiveUsdPer100Gd: 8.33,
    payingUsers: 1,
    commerceTruthLabel: "live",
    commerceSourceLabel: "server purchase verification facts",
    commerceEmptyReason: null,
    kpiCards: [],
  };
}

describe("user management refactor contract", () => {
  it("builds compact user management summaries with identity, consent, metrics, confidence, and debug status", () => {
    const model = buildUserManagementSummary({
      user: user(),
      analytics: analytics(),
      summary: summary(),
      personMetricsHydration: hydration(),
      generatedAtUtc: "2026-05-23T12:00:00.000Z",
    });

    expect(model.identity).toMatchObject({
      userId: "user_1",
      displayName: "Fan Example",
      email: "fan@example.com",
    });
    expect(model.accountState.status).toBe("active");
    expect(model.creatorRole.role).toBe("creator");
    expect(model.guestLinkStatus.visible).toBe(true);
    expect(model.consentMode.visible).toBe(true);
    expect(model.activitySummary.totalEvents).toBe(14);
    expect(model.personMetricConfidence.lowConfidenceMetrics[0]).toMatchObject({
      metricId: "fan_pass_purchases",
      missingProducer: "creator_fan_pass_started",
      missingBridge: "person_metrics.fan_pass_purchases",
      missingMaterializer: "person_metrics.fan_pass_purchases",
    });
    expect(model.walletPaymentConfidence.paymentApprovals).toBe(1);
    expect(model.dropUnwrapMetrics.unwraps).toBe(2);
    expect(model.supportAccountSafety.status).toBe("clean");
    expect(model.telemetryDebugStatus.debugLane).toBe("User management");
    expect(model.lastActivity.source).toBe("analytics_users_rollup");
    expect(model.rawEventsDefaultOpen).toBe(false);
  });

  it("marks missing metrics as collecting or unavailable with exact source explanation instead of zero", () => {
    const model = buildUserManagementSummary({
      user: user({ privacySettings: undefined }),
      analytics: null,
      summary: null,
      personMetricsHydration: hydration(),
      generatedAtUtc: "2026-05-23T12:00:00.000Z",
    });

    expect(model.activitySummary.state).toBe("collecting");
    expect(model.activitySummary.provenZero).toBe(false);
    expect(model.activitySummary.missingSource).toContain("analytics_users_rollup");
    expect(model.consentMode.mode).toBe("unavailable");
    expect(model.personMetricConfidence.lowConfidenceMetrics[0].explanation).toContain("creator_fan_pass_started");
  });

  it("reports the refactor lane and score impact without protected runtime changes", () => {
    const report = buildUserManagementRefactorReport({
      users: [user()],
      analyticsByUser: { user_1: analytics() },
      summary: summary(),
      personMetricsHydration: hydration(),
      generatedAtUtc: "2026-05-23T12:00:00.000Z",
      changedFiles: [
        "src/lib/admin/user-management-contract.ts",
        "src/app/admin/users/page.tsx",
        "src/app/api/admin/users/route.ts",
        "docs/agent-truth/user-management-refactor.md",
      ],
    });

    expect(report.debugLane).toMatchObject({
      label: "User management",
      rawDumpsBeforeSummary: false,
      duplicateUserMetricSections: 0,
      summaryFirstRoute: true,
    });
    expect(report.validation.chatNavPaymentRuntimeChanged).toBe(false);
    expect(Object.keys(report.scoreImpactByDimension)).toEqual([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]);
    expect(report.dirtyFiles.every((file) => file.classification !== "unsafe_unknown")).toBe(true);
  });

  it("keeps the admin users UI summary-first and raw rows behind drilldown", () => {
    const adminUsersPage = read("src/app/admin/users/page.tsx");
    const adminDebugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
    const adminUsersRoute = read("src/app/api/admin/users/route.ts");

    expect(adminUsersPage).toContain("data-admin-user-management-summary-lane");
    expect(adminUsersPage).toContain("data-admin-user-management-identity-handoff");
    expect(adminUsersPage).toContain("data-admin-user-management-consent-mode");
    expect(adminUsersPage).toContain("data-admin-user-management-metric-confidence");
    expect(adminUsersPage).toContain("<details");
    expect(adminUsersPage).not.toMatch(/<pre[\s\S]{0,200}JSON\.stringify/);
    expect(adminDebugSummary).toContain("user_management");
    expect(adminUsersRoute).toContain('mode === "summary"');
    expect(adminUsersRoute).toContain("readAdminUsersFastSummarySnapshot");
  });

  it("classifies scoped dirty files and protected surfaces", () => {
    expect(classifyUserManagementDirtyFile("src/components/Navbar.tsx")).toBe("protected_chat_nav_payment_runtime_change");
    expect(classifyUserManagementDirtyFile("src/components/PurchaseModal.tsx")).toBe("protected_chat_nav_payment_runtime_change");
    expect(classifyUserManagementDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("protected_chat_nav_payment_runtime_change");
    expect(classifyUserManagementDirtyFile("src/lib/admin/user-management-contract.ts")).toBe("real_source_change_needs_review");
    expect(classifyUserManagementDirtyFile("agent/state/user-management-refactor.generated.json")).toBe("current_generated_artifact_to_commit");
  });
});
