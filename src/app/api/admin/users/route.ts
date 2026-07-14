import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type {
  AdminBehaviorLeaderboardFilter,
  AdminBehaviorLeaderboardPanel,
  AdminBehaviorLeaderboardRow,
  AdminUsersKpiCard,
  AdminUsersResponse,
  UsersSummary,
} from "@/types/admin-analytics";
import type { AdminUserMetricsSnapshot, AdminUserMetricsSnapshotMetadata } from "@/lib/admin-user-metrics-contract";
import { toAdminUserTruthSnapshot } from "@/lib/server/admin-user-truth-snapshot";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { buildAdminInvalidRequestResponse } from "@/lib/server/admin-route-errors";
import { ADMIN } from "@/lib/server/rate-limit";
import { BUILT_IN_DAILY_TASK_MAP } from "@/lib/tasks/task-catalog";
import { getDropReferenceMap } from "@/lib/server/drop-references";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { normalizeGumdropBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";
import { normalizeCreatorApplication, sanitizeCreatorApplicationUpdate } from "@/lib/creator-application";
import {
  buildCreatorOnboardingCanonicalRecord,
  buildCreatorOnboardingUserProjection,
  normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import {
  buildCreatorOnboardingStatusChangeHistoryEntries,
  CREATOR_ONBOARDING_COLLECTION,
  CreatorOnboardingActor,
  isCreatorOwnerEmail,
  recordCreatorOnboardingHistoryEntries,
  shouldActivateCreatorRole,
  syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import {
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildAdminOnBehalfMarker,
  buildActorMarkerDebugFields,
  type ActorMarker,
} from "@/lib/identity-truth/identity/actor-markers";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { buildAdminUserMetricsSnapshot } from "@/lib/server/admin-user-metrics-snapshot";
import { buildBehavioralTruthSummary } from "@/lib/behavioral/behavioral-truth-source";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import {
  buildCommerceMetricsFromRollup,
  buildEmptyCommerceMetrics,
} from "@/lib/admin-user-commerce";
import {
  buildAdminUserEngagementDay,
  buildAdminUserMetricIntegrity,
  buildAdminUserValueDay,
  shouldRecoverAdminUserMetricsFromFacts,
} from "@/lib/admin-user-metrics";
import {
  buildUserEngagementScoreInputFromActivityDays,
  type UserEngagementActivityDay,
} from "@/lib/behavioral/user-engagement-score";
import {
  buildUserValueScoreInputFromActivityDays,
  type UserValueActivityDay,
} from "@/lib/behavioral/user-value-score";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { buildUserBehaviorRollup } from "@/lib/server/user-behavior-rollup";
import { buildWatchTimeRollupFromRecords } from "@/lib/server/watch-time-rollup";
import {
  buildWatchTimeRollupBehaviorInput,
  isLegacyWatchTimeRollupSource,
  isVerifiedWatchTimeRollupSource,
} from "@/lib/watch-time-rollup-contract";

const ADMIN_USERS_LIST_LIMIT = 500;
const ADMIN_USERS_BODY_LIMIT_BYTES = 64_000;
const ADMIN_USERS_DAILY_ROLLUP_LIMIT = 1_000;
const ADMIN_USERS_WATCH_SESSION_LIMIT = 500;
const ADMIN_USERS_CREATOR_OPS_LIMIT = 500;
const ADMIN_USERS_PENDING_DROP_LIMIT = 200;
const ADMIN_USERS_EVENT_FACT_RECOVERY_LIMIT = 1_000;
const ADMIN_USERS_DEFAULT_MODE = "summary";

function isAdminUsersRequestRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type AdminUsersKpiFreshness = AdminUsersKpiCard["freshnessState"];

function emptyAdminUsersQuerySnapshot() {
  return { docs: [], size: 0 } as unknown as FirebaseFirestore.QuerySnapshot;
}

function toTimestampNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function toUtcIsoString(timestampMs: number) {
  return timestampMs > 0 ? new Date(timestampMs).toISOString() : new Date().toISOString();
}

function toUtcIsoStringOrNull(timestampMs: number) {
  return timestampMs > 0 ? new Date(timestampMs).toISOString() : null;
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatCompactMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  return `$${value.toFixed(2)}`;
}

function formatHoursOrMinutes(valueMs: number) {
  const safeMs = Math.max(0, Math.round(valueMs));
  const totalMinutes = Math.round(safeMs / 60_000);

  if (safeMs >= 3_600_000) {
    return `${Number((safeMs / 3_600_000).toFixed(1))}h`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  return "0h";
}

function mapSnapshotFreshnessToKpiState(
  freshnessState: AdminUserMetricsSnapshot["freshnessState"],
): AdminUsersKpiFreshness {
  if (freshnessState === "live") return "live";
  if (freshnessState === "stale") return "stale";
  if (freshnessState === "degraded") return "degraded";
  return "unknown";
}

function mapCommerceTruthToKpiState(
  commerceTruthLabel: UsersSummary["commerceTruthLabel"],
  options?: { delayedExpected?: boolean },
): AdminUsersKpiFreshness {
  if (commerceTruthLabel === "live") {
    return "live";
  }

  if (commerceTruthLabel === "partial") {
    return "review";
  }

  if (commerceTruthLabel === "stale") {
    return options?.delayedExpected ? "delayed" : "stale";
  }

  return "unknown";
}

function shortId(value: string) {
  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function clampPageSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 10;
  }

  return Math.min(20, Math.max(5, Math.round(value)));
}

function clampPositiveInteger(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.round(value);
}

function computeBehaviorLeaderboardFallbackScore(input: {
  purchaseCount: number;
  unlockCount: number;
  watchSeconds: number;
  returnedInLast7d: boolean;
  meaningfulActions: number;
  freeIntent: number;
}) {
  const normalize = (value: number, max: number) => Math.max(0, Math.min(1, value / max));
  const purchaseSignal = normalize(input.purchaseCount, 5);
  const unlockSignal = normalize(input.unlockCount, 12);
  const watchSignal = normalize(input.watchSeconds, 10_800);
  const returnSignal = input.returnedInLast7d ? 1 : 0;
  const actionSignal = normalize(input.meaningfulActions, 25);
  const freeIntentSignal = normalize(input.freeIntent, 250);

  return Math.round(100 * (
    (0.24 * purchaseSignal) +
    (0.23 * unlockSignal) +
    (0.23 * watchSignal) +
    (0.13 * returnSignal) +
    (0.10 * actionSignal) +
    (0.07 * freeIntentSignal)
  ));
}

function mapBehaviorLeaderboardSourceTruth(source?: string): AdminBehaviorLeaderboardRow["sourceTruth"] {
  if (source === "materialized_rollup") return "materialized_behavior";
  if (source === "event_facts") return "event_facts";
  if (source === "live_fallback" || source === "legacy_fallback" || source === "user_profile_fields") {
    return "rollup_fallback";
  }

  return "partial";
}

function mapBehaviorLeaderboardFreshnessState(freshnessState?: string): AdminBehaviorLeaderboardRow["freshnessState"] {
  if (freshnessState === "live") return "live";
  if (freshnessState === "stale") return "stale";
  if (freshnessState === "degraded") return "review";
  return "unknown";
}

function buildAdminUsersKpiCards(input: {
  summary: Omit<UsersSummary, "kpiCards">;
}): AdminUsersKpiCard[] {
  const summary = input.summary;
  const snapshot = summary.metricsSnapshot;
  const generatedAtUtc = toUtcIsoString(snapshot?.generatedAt ?? Date.now());
  const totalUsers = Math.max(0, summary.totalUsers);
  const returnedShare = totalUsers > 0
    ? `${formatCount(summary.returnedInLast7Days ?? summary.activeLast7Days ?? 0)} / ${formatCount(totalUsers)} users`
    : "0 / 0 users";
  const onboardedShare = totalUsers > 0
    ? `${formatCount(summary.onboardingCompletedUsers)} / ${formatCount(totalUsers)} users`
    : "0 / 0 users";
  const snapshotFreshness = mapSnapshotFreshnessToKpiState(snapshot?.freshnessState ?? "unavailable");
  const commerceFreshness = mapCommerceTruthToKpiState(summary.commerceTruthLabel);
  const commerceDelayedFreshness = mapCommerceTruthToKpiState(summary.commerceTruthLabel, { delayedExpected: true });
  const watchEstimate = snapshot?.watchTimeDiagnosticEstimate;
  const watchSource = snapshot?.watchTimeSource ?? "unavailable";
  const watchWarnings = snapshot?.watchTimeIssues.map((issue) => issue.message) ?? [];
  const hasVerifiedWatch = isVerifiedWatchTimeRollupSource(watchSource);
  const hasLegacyWatch = isLegacyWatchTimeRollupSource(watchSource);
  const watchEstimatedDisplay = watchEstimate ? formatHoursOrMinutes(watchEstimate.estimatedWatchMs) : null;
  const watchPrimaryValue = hasVerifiedWatch || hasLegacyWatch
    ? formatHoursOrMinutes(snapshot?.watchTimeMs ?? 0)
    : watchEstimate
      ? "Unknown"
      : "Unknown";
  const watchSecondaryValue = hasVerifiedWatch
    ? "foreground viewer time"
    : hasLegacyWatch
      ? `${formatHoursOrMinutes(snapshot?.watchTimeMs ?? 0)} legacy page-duration fallback`
      : watchEstimatedDisplay
        ? `verified watch unavailable · ${watchEstimatedDisplay} diagnostics-only estimate`
        : "watch-session source unavailable";
  const watchFreshness: AdminUsersKpiFreshness = hasVerifiedWatch
    ? snapshotFreshness
    : hasLegacyWatch
      ? "review"
      : watchEstimate
        ? "degraded"
        : "unknown";
  const watchReasonCode = hasLegacyWatch
    ? "legacy_watch_fallback"
    : watchEstimate
      ? "watch_time_estimate_only"
      : watchSource === "unavailable"
        ? "watch_time_source_unavailable"
        : snapshot?.watchTimeIssues.some((issue) => issue.code === "watch_time_missing_despite_views")
          ? "watch_time_missing_despite_views"
          : undefined;

  return [
    {
      id: "total_users",
      label: "Users",
      primaryValue: formatCount(totalUsers),
      secondaryValue: `${formatCount(summary.activeUsers)} status-active accounts`,
      scope: "lifetime",
      sourceTruth: "user_docs",
      freshnessState: snapshotFreshness === "unknown" ? "review" : snapshotFreshness,
      explanation: "Lifetime account count from user docs. The secondary line reflects account status, not live presence or active-now usage.",
      generatedAtUtc,
      warnings: snapshot?.source === "live_fallback" ? ["Summary is using a live fallback snapshot."] : [],
      sourceLabel: snapshot?.source ?? "user_docs",
    },
    {
      id: "returned_7d",
      label: "Returners",
      primaryValue: formatCount(summary.returnedInLast7Days ?? summary.activeLast7Days ?? 0),
      secondaryValue: returnedShare,
      scope: "rolling_7d",
      sourceTruth: snapshot?.source === "live_fallback" ? "partial" : "materialized_snapshot",
      freshnessState: snapshotFreshness,
      reasonCode: snapshotFreshness === "degraded" || snapshotFreshness === "stale"
        ? "activity_snapshot_partial"
        : undefined,
      explanation: "Logged in, visited, or emitted tracked activity in the last 7 days.",
      generatedAtUtc,
      warnings: snapshot?.issues ?? [],
      sourceLabel: snapshot?.truthSource ?? snapshot?.source ?? "materialized_snapshot",
    },
    {
      id: "unwraps",
      label: "Unwraps",
      primaryValue: formatCount(summary.totalUnwraps),
      secondaryValue: "lifetime unlock/access count",
      scope: "lifetime",
      sourceTruth: "unlock_rollups",
      freshnessState: commerceFreshness,
      reasonCode: commerceFreshness === "review" || commerceFreshness === "stale"
        ? "unlock_rollup_partial"
        : undefined,
      explanation: "Unlock/access count from commerce and entitlement rollups. Purchase counts are tracked separately.",
      generatedAtUtc,
      warnings: [],
      sourceLabel: summary.commerceSourceLabel ?? "unlock_rollups",
    },
    {
      id: "purchases",
      label: "Purchases",
      primaryValue: formatCount(summary.totalPurchases),
      secondaryValue: "lifetime completed purchases",
      scope: "lifetime",
      sourceTruth: "commerce_rollups",
      freshnessState: commerceFreshness,
      reasonCode: commerceFreshness === "review" || commerceFreshness === "stale"
        ? "purchase_rollup_partial"
        : undefined,
      explanation: "Completed purchase count from commerce rollups and transaction-backed analytics summaries.",
      generatedAtUtc,
      warnings: summary.commerceEmptyReason ? [summary.commerceEmptyReason] : [],
      sourceLabel: summary.commerceSourceLabel ?? "commerce_rollups",
    },
    {
      id: "watch_time",
      label: "Watch",
      primaryValue: watchPrimaryValue,
      secondaryValue: watchSecondaryValue,
      scope: "lifetime",
      sourceTruth: hasVerifiedWatch ? "watch_sessions" : "partial",
      freshnessState: watchFreshness,
      reasonCode: watchReasonCode,
      explanation: hasVerifiedWatch
        ? "Verified foreground viewer time from canonical watch sessions."
        : hasLegacyWatch
          ? "Watch time is visible, but it comes from labeled legacy page-duration fallback instead of canonical watch sessions."
          : watchEstimate
            ? "Verified watch time is unavailable here. The estimate is diagnostics-only and does not count as verified watch time."
            : "No canonical watch-session total is available for this summary card yet.",
      generatedAtUtc,
      warnings: watchWarnings,
      sourceLabel: watchSource,
      formula: hasVerifiedWatch
        ? "watch time = summed foreground-visible watch session intervals"
        : hasLegacyWatch
          ? "watch time = legacy page-duration fallback"
          : watchEstimate
            ? "estimated watch = diagnostics-only fallback; not counted as verified watch"
            : undefined,
    },
    {
      id: "revenue",
      label: "Revenue",
      primaryValue: formatCompactMoney(summary.grossRevenueUsd),
      secondaryValue: `adjustments ${formatCompactMoney(summary.adjustedProfitUsd)} · bonus exposure ${formatCompactMoney(summary.bonusValueUsd)}`,
      scope: "lifetime",
      sourceTruth: "commerce_rollups",
      freshnessState: commerceDelayedFreshness,
      reasonCode: commerceDelayedFreshness === "delayed"
        ? "expected_settlement_delay"
        : commerceDelayedFreshness === "review" || commerceDelayedFreshness === "stale"
          ? "commerce_snapshot_partial"
          : undefined,
      explanation: "Gross revenue is shown separately from adjustments and bonus exposure. Settlement timing can delay the latest commerce snapshot.",
      generatedAtUtc,
      warnings: summary.commerceEmptyReason ? [summary.commerceEmptyReason] : [],
      sourceLabel: summary.commerceSourceLabel ?? "commerce_rollups",
      formula: "gross revenue = completed commerce total; adjustments and bonus exposure are tracked separately",
    },
    {
      id: "paying_users",
      label: "Paying",
      primaryValue: formatCount(summary.payingUsers),
      secondaryValue: `avg ${formatCompactMoney(summary.averageOrderUsd)} · rate ${formatCompactMoney(summary.effectiveUsdPer100Gd)}`,
      scope: "lifetime",
      sourceTruth: "commerce_rollups",
      freshnessState: commerceDelayedFreshness,
      reasonCode: commerceDelayedFreshness === "delayed"
        ? "expected_settlement_delay"
        : commerceDelayedFreshness === "review" || commerceDelayedFreshness === "stale"
          ? "commerce_snapshot_partial"
          : undefined,
      explanation: "Paying users are accounts with at least one tracked purchase. Average order is gross revenue divided by completed purchases. Rate is gross revenue per delivered 100 GumDrops.",
      generatedAtUtc,
      warnings: summary.commerceEmptyReason ? [summary.commerceEmptyReason] : [],
      sourceLabel: summary.commerceSourceLabel ?? "commerce_rollups",
      formula: "avg order = gross revenue / purchases; rate = gross revenue / (delivered GumDrops / 100)",
    },
    {
      id: "verified",
      label: "Verified",
      primaryValue: formatCount(summary.verifiedUsers),
      secondaryValue: "badge-ready accounts",
      scope: "lifetime",
      sourceTruth: "verification_profile",
      freshnessState: snapshotFreshness === "unknown" ? "review" : snapshotFreshness,
      reasonCode: snapshotFreshness === "stale" || snapshotFreshness === "degraded"
        ? "verification_snapshot_partial"
        : undefined,
      explanation: "Accounts with verification status ready for the badge/program state shown in admin.",
      generatedAtUtc,
      warnings: [],
      sourceLabel: snapshot?.source ?? "verification_profile",
    },
    {
      id: "push_enabled",
      label: "Push",
      primaryValue: formatCount(summary.notificationsEnabledUsers),
      secondaryValue: "browser alerts on",
      scope: "lifetime",
      sourceTruth: "push_profile",
      freshnessState: snapshotFreshness === "unknown" ? "review" : snapshotFreshness,
      reasonCode: snapshotFreshness === "stale" || snapshotFreshness === "degraded"
        ? "push_profile_partial"
        : undefined,
      explanation: "Accounts with browser push notifications enabled in the user profile.",
      generatedAtUtc,
      warnings: [],
      sourceLabel: snapshot?.source ?? "push_profile",
    },
    {
      id: "onboarded",
      label: "Onboarded",
      primaryValue: formatCount(summary.onboardingCompletedUsers),
      secondaryValue: onboardedShare,
      scope: "lifetime",
      sourceTruth: "onboarding_facts",
      freshnessState: snapshotFreshness === "unknown" ? "review" : snapshotFreshness,
      reasonCode: snapshotFreshness === "stale" || snapshotFreshness === "degraded"
        ? "onboarding_snapshot_partial"
        : undefined,
      explanation: "Users who completed the onboarding/setup flow.",
      generatedAtUtc,
      warnings: [],
      sourceLabel: snapshot?.source ?? "onboarding_facts",
    },
  ];
}

function isBehaviorLeaderboardEligibleUser(user: ReturnType<typeof serializeUserDoc>) {
  const username = (user.username ?? "").toLowerCase();
  const email = (user.email ?? "").toLowerCase();
  const displayName = (user.displayName ?? "").toLowerCase();
  const uid = (user.uid ?? "").toLowerCase();

  if (user.role !== "user") {
    return false;
  }

  if (uid.startsWith("system_")) {
    return false;
  }

  if (username.includes("system") || username.includes("bot")) {
    return false;
  }

  if (email.includes("example.com") || email.includes("system") || email.includes("bot")) {
    return false;
  }

  if (displayName.includes("system") || displayName.includes("bot")) {
    return false;
  }

  return true;
}

function matchesBehaviorLeaderboardFilter(
  row: AdminBehaviorLeaderboardRow,
  filter: AdminBehaviorLeaderboardFilter,
) {
  if (filter === "returned_7d") {
    return row.returnedInLast7d;
  }

  if (filter === "purchasers") {
    return row.purchaseCount > 0;
  }

  if (filter === "unwrappers") {
    return row.unlockCount > 0;
  }

  if (filter === "low_confidence") {
    return row.behaviorConfidence < 60 || row.sourceTruth === "partial";
  }

  return true;
}

function buildBehaviorLeaderboardPanel(input: {
  users: Array<ReturnType<typeof serializeUserDoc>>;
  analyticsByUser: Record<string, {
    eventCount?: number;
    unwrapCount?: number;
    purchaseCount?: number;
    watchSecondsTotal?: number;
    lastSeenAt?: number;
    lastPurchaseAt?: number;
    rewardGdEarned?: number;
    authSuccessCount?: number;
    engagementScore?: number;
    valueScore?: number;
    behaviorRollup?: {
      engagement: { score: number };
      value: { valueScore: number };
      confidenceScore: number;
      source: string;
      freshnessState: string;
      issues: Array<{ message: string }>;
    };
  }>;
  page: number;
  pageSize: number;
  filter: AdminBehaviorLeaderboardFilter;
  generatedAtMs: number;
}): AdminBehaviorLeaderboardPanel {
  const eligibleRows = input.users
    .filter(isBehaviorLeaderboardEligibleUser)
    .map((user) => {
      const analytics = input.analyticsByUser[user.uid];
      const behaviorRollup = analytics?.behaviorRollup;
      const fallbackScore = computeBehaviorLeaderboardFallbackScore({
        purchaseCount: analytics?.purchaseCount ?? 0,
        unlockCount: analytics?.unwrapCount ?? 0,
        watchSeconds: analytics?.watchSecondsTotal ?? 0,
        returnedInLast7d: (analytics?.lastSeenAt ?? 0) > (input.generatedAtMs - (7 * 24 * 60 * 60 * 1000)),
        meaningfulActions: analytics?.eventCount ?? 0,
        freeIntent: user.gumDropsRewardBalance ?? 0,
      });
      const engagementScore = analytics?.engagementScore
        ?? behaviorRollup?.engagement.score
        ?? fallbackScore;
      const sourceTruth = behaviorRollup
        ? mapBehaviorLeaderboardSourceTruth(behaviorRollup.source)
        : "partial";
      const freshnessState = behaviorRollup
        ? mapBehaviorLeaderboardFreshnessState(behaviorRollup.freshnessState)
        : "review";
      const lastMeaningfulActionAt = Math.max(
        analytics?.lastPurchaseAt ?? 0,
        analytics?.lastSeenAt ?? 0,
        user.lastCheckIn ?? 0,
      );

      return {
        userId: user.uid,
        displayName: user.displayName || user.username || "Unknown user",
        username: user.username || undefined,
        shortUserId: shortId(user.uid),
        userIdentityState: user.displayName || user.username
          ? "resolved"
          : user.uid
            ? "fallback_uid"
            : "missing",
        engagementScore,
        valueScore: analytics?.valueScore ?? behaviorRollup?.value.valueScore ?? null,
        behaviorConfidence: behaviorRollup?.confidenceScore ?? 0,
        returnedInLast7d: (analytics?.lastSeenAt ?? 0) > (input.generatedAtMs - (7 * 24 * 60 * 60 * 1000)),
        lastSeenAtUtc: toUtcIsoStringOrNull(analytics?.lastSeenAt ?? 0),
        lastMeaningfulActionAtUtc: toUtcIsoStringOrNull(lastMeaningfulActionAt),
        unlockCount: analytics?.unwrapCount ?? 0,
        purchaseCount: analytics?.purchaseCount ?? 0,
        watchSeconds: analytics?.watchSecondsTotal ?? 0,
        taskCompletions: Object.keys(user.dailyTasksState?.completedTaskHistory ?? {}).length,
        sourceTruth,
        freshnessState,
        warnings: [
          ...(behaviorRollup?.issues.map((issue) => issue.message) ?? []),
          ...(analytics?.engagementScore == null && !behaviorRollup ? ["Engagement score is using deterministic fallback inputs."] : []),
        ],
      } satisfies AdminBehaviorLeaderboardRow;
    })
    .filter((row) => matchesBehaviorLeaderboardFilter(row, input.filter))
    .sort((left, right) => (
      (right.engagementScore - left.engagementScore)
      || ((right.valueScore ?? 0) - (left.valueScore ?? 0))
      || ((Date.parse(right.lastMeaningfulActionAtUtc ?? "") || 0) - (Date.parse(left.lastMeaningfulActionAtUtc ?? "") || 0))
      || (right.purchaseCount - left.purchaseCount)
      || (right.unlockCount - left.unlockCount)
    ));

  const totalEligibleUsers = eligibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEligibleUsers / input.pageSize));
  const safePage = Math.min(totalPages, Math.max(1, input.page));
  const pageStart = (safePage - 1) * input.pageSize;
  const rows = eligibleRows.slice(pageStart, pageStart + input.pageSize);
  const sourceFreshness = rows.some((row) => row.freshnessState === "review")
    ? "review"
    : rows.some((row) => row.freshnessState === "stale")
      ? "stale"
      : rows.length > 0
        ? "live"
        : "unknown";
  const sourceTruth = rows.some((row) => row.sourceTruth === "partial")
    ? "partial"
    : rows.some((row) => row.sourceTruth === "rollup_fallback")
      ? "rollup_fallback"
      : rows.some((row) => row.sourceTruth === "event_facts")
        ? "event_facts"
        : rows.length > 0
          ? "materialized_behavior"
          : "partial";

  return {
    generatedAtUtc: toUtcIsoString(input.generatedAtMs),
    sourceFreshness,
    sourceTruth,
    totalEligibleUsers,
    page: safePage,
    pageSize: input.pageSize,
    totalPages,
    filter: input.filter,
    rows,
    warnings: rows.length === 0
      ? ["No behavior rollups available yet. Run behavior materializer or inspect event facts."]
      : [],
  };
}

function readStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readUserRole(value: unknown): "user" | "creator" | "admin" {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

class InvalidCreatorApplicationUpdateError extends Error {}
class InvalidCreatorOnboardingTransitionError extends Error {}
class ForbiddenCreatorOnboardingActionError extends Error {}

// Deprecated compatibility bridge: this generic admin route may accept a
// creatorApplication patch only to rebuild canonical creator_onboarding plus
// projections and history. Admin Roster lifecycle actions must use the typed
// /api/admin/creators/[userId]/action route instead.
function resolveCreatorApplicationUpdate(input: {
  patch: Record<string, unknown>;
  currentProjection: ReturnType<typeof normalizeCreatorApplication> | undefined;
  currentCanonical: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
  nowMs: number;
  reviewedBy: string | null;
}) {
  const baseProjection = input.currentProjection ?? buildCreatorOnboardingUserProjection(input.currentCanonical);
  const mergedSource: Record<string, unknown> = {
    ...baseProjection,
    ...input.patch,
    queuePosition: input.patch.queuePosition ?? baseProjection.queuePosition ?? input.currentCanonical.queuePosition,
    creatorDisplayName: input.patch.creatorDisplayName ?? baseProjection.creatorDisplayName ?? input.currentCanonical.creatorDisplayName,
    creatorPrimaryPlatform: input.patch.creatorPrimaryPlatform ?? baseProjection.creatorPrimaryPlatform ?? input.currentCanonical.creatorPrimaryPlatform,
    creatorContentFocus: input.patch.creatorContentFocus ?? baseProjection.creatorContentFocus ?? input.currentCanonical.creatorContentFocus,
  };

  const normalized = sanitizeCreatorApplicationUpdate(mergedSource, {
    nowMs: input.nowMs,
    reviewedBy: input.reviewedBy,
  });

  if (!normalized) {
    throw new InvalidCreatorApplicationUpdateError("Invalid creator application update.");
  }

  return normalized;
}

function buildCreatorApplicationAdminSource(
  current: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>,
  incoming: ReturnType<typeof sanitizeCreatorApplicationUpdate>,
  nowMs: number,
  actorLabel: string,
) {
  if (!incoming) {
    return current;
  }

  const nextSource: Record<string, unknown> = {
    ...current,
    ...incoming,
    updatedAt: nowMs,
    reviewedBy: actorLabel,
    lastAdminActionAt: nowMs,
    lastAdminActionBy: actorLabel,
    blockingReasons: undefined,
    readyForApproval: undefined,
    creatorReviewQueueVisible: undefined,
  };

  if (current.submissionStatus !== incoming.submissionStatus) {
    if (incoming.submissionStatus === "onboarding_submitted" && !current.onboardingSubmittedAt) {
      nextSource.onboardingSubmittedAt = nowMs;
    }
    if (incoming.submissionStatus === "awaiting_manual_review" && !current.awaitingManualReviewAt) {
      nextSource.awaitingManualReviewAt = nowMs;
    }
  }

  if (current.legalStatus !== incoming.legalStatus) {
    if (incoming.legalStatus === "legal_sent") {
      nextSource.legalDocumentSentAt = nowMs;
    }
    if (incoming.legalStatus === "legal_signed") {
      nextSource.legalDocumentSignedAt = nowMs;
    }
  }

  if (current.contractDocumentStatus !== incoming.contractDocumentStatus && incoming.contractDocumentStatus === "contract_sent") {
    nextSource.legalDocumentSentAt = nowMs;
  }

  if (current.creatorSignatureStatus !== incoming.creatorSignatureStatus && incoming.creatorSignatureStatus === "signature_signed") {
    nextSource.creatorContractSignedAt = nextSource.creatorContractSignedAt ?? nowMs;
  }

  if (current.adminSignatureStatus !== incoming.adminSignatureStatus && incoming.adminSignatureStatus === "signature_signed") {
    nextSource.adminContractSignedAt = nextSource.adminContractSignedAt ?? nowMs;
    nextSource.legalDocumentSignedAt = nowMs;
  }

  if (current.idVerificationStatus !== incoming.idVerificationStatus) {
    if (incoming.idVerificationStatus === "id_requested") {
      nextSource.idVerificationRequestedAt = nowMs;
    }
    if (incoming.idVerificationStatus === "id_verified" || incoming.idVerificationStatus === "id_rejected") {
      nextSource.idVerificationReviewedAt = nowMs;
    }
    if (incoming.idVerificationStatus === "id_requested" || incoming.idVerificationStatus === "id_not_requested") {
      nextSource.idVerificationSubmittedAt = undefined;
    }
  }

  if (current.approvalStatus !== incoming.approvalStatus && incoming.approvalStatus === "creator_rejected") {
    nextSource.rejectedAt = nowMs;
    nextSource.reapplyAvailableAt = nowMs + (30 * 24 * 60 * 60 * 1000);
  }

  if (current.ownerOverrideActive !== incoming.ownerOverrideActive) {
    if (incoming.ownerOverrideActive) {
      nextSource.ownerOverrideAt = nowMs;
      nextSource.ownerOverrideBy = actorLabel;
    }
  }

  if (current.legallyClearedAt !== incoming.legallyClearedAt) {
    if (incoming.legallyClearedAt) {
      nextSource.legallyClearedAt = nowMs;
      nextSource.legallyClearedBy = actorLabel;
    } else {
      nextSource.legallyClearedAt = undefined;
      nextSource.legallyClearedBy = undefined;
      nextSource.agreementBasis = undefined;
    }
  }

  return nextSource;
}

function buildCreatorLifecycleEvents(input: {
  before: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
  after: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
}) {
  const events: Array<
    | "creator_legal_sent"
    | "creator_legal_signed"
    | "creator_id_requested"
    | "creator_id_verified"
    | "creator_id_rejected"
    | "creator_segment_assigned"
    | "creator_approved"
    | "creator_rejected"
    | "creator_needs_changes"
    | "creator_role_activated"
    | "creator_role_activation_blocked"
    | "owner_override_applied"
    | "owner_override_cleared"
    | "creator_legally_cleared_override"
  > = [];

  if (!input.before.legallyClearedAt && input.after.legallyClearedAt) {
    events.push("creator_legally_cleared_override");
  }

  if (input.before.legalStatus !== input.after.legalStatus) {
    if (input.after.legalStatus === "legal_sent") {
      events.push("creator_legal_sent");
    } else if (input.after.legalStatus === "legal_signed") {
      events.push("creator_legal_signed");
    }
  }

  if (input.before.idVerificationStatus !== input.after.idVerificationStatus) {
    if (input.after.idVerificationStatus === "id_requested") {
      events.push("creator_id_requested");
    } else if (input.after.idVerificationStatus === "id_verified") {
      events.push("creator_id_verified");
    } else if (input.after.idVerificationStatus === "id_rejected") {
      events.push("creator_id_rejected");
    }
  }

  if (
    input.before.segmentationStatus !== input.after.segmentationStatus
    && input.after.segmentationStatus === "segment_assigned"
  ) {
    events.push("creator_segment_assigned");
  }

  if (input.before.approvalStatus !== input.after.approvalStatus) {
    if (input.after.approvalStatus === "creator_approved") {
      events.push("creator_approved");
    } else if (input.after.approvalStatus === "creator_rejected") {
      events.push("creator_rejected");
    } else if (input.after.approvalStatus === "creator_needs_changes") {
      events.push("creator_needs_changes");
    }
  }

  if (input.before.ownerOverrideActive !== input.after.ownerOverrideActive) {
    if (input.after.ownerOverrideActive) {
      events.push("owner_override_applied");
    } else {
      events.push("owner_override_cleared");
    }
  }

  if (input.before.role !== "creator" && input.after.role === "creator") {
    events.push("creator_role_activated");
  }

  if (
    input.after.approvalStatus === "creator_approved"
    && input.after.role !== "creator"
    && (input.before.approvalStatus !== "creator_approved" || input.before.role === "creator")
  ) {
    events.push("creator_role_activation_blocked");
  }

  return events;
}

async function emitCreatorLifecycleTelemetry(
  events: ReturnType<typeof buildCreatorLifecycleEvents>,
  userId: string,
  actorMarker: ActorMarker,
  state: {
    onboardingStatus?: string;
    legalStatus?: string;
    agreementVersion?: string;
  } = {},
) {
  await Promise.allSettled(events.map((eventName) => {
    const payload = {
      page_path: `/admin/user/${userId}`,
      onboarding_status: state.onboardingStatus ?? "",
      legal_status: state.legalStatus ?? "",
      agreement_version: state.agreementVersion ?? "",
      ...actorMarkerToTelemetryPayload(actorMarker),
    };

    switch (eventName) {
      case "creator_legal_sent":
        return trackServerEvent("creator_legal_sent", payload, userId);
      case "creator_legal_signed":
        return trackServerEvent("creator_legal_signed", payload, userId);
      case "creator_id_requested":
        return trackServerEvent("creator_id_requested", payload, userId);
      case "creator_id_verified":
        return trackServerEvent("creator_id_verified", payload, userId);
      case "creator_id_rejected":
        return trackServerEvent("creator_id_rejected", payload, userId);
      case "creator_segment_assigned":
        return trackServerEvent("creator_segment_assigned", payload, userId);
      case "creator_role_activated":
        return trackServerEvent("creator_role_activated", payload, userId);
      case "creator_role_activation_blocked":
        return trackServerEvent("creator_role_activation_blocked", payload, userId);
      case "owner_override_applied":
        return trackServerEvent("owner_override_applied", payload, userId);
      case "owner_override_cleared":
        return trackServerEvent("owner_override_cleared", payload, userId);
      case "creator_legally_cleared_override":
        return trackServerEvent("creator_legally_cleared_override", payload, userId);
      case "creator_approved":
        return trackServerEvent("creator_approved", payload, userId);
      case "creator_rejected":
        return trackServerEvent("creator_rejected", payload, userId);
      case "creator_needs_changes":
        return trackServerEvent("creator_needs_changes", payload, userId);
      default:
        return Promise.resolve();
    }
  }));
}

function buildAdminUsersActor(input: {
  uid?: string | null;
  email?: string | null;
  isOwner: boolean;
}) {
  return {
    uid: input.uid,
    email: input.email,
    role: input.isOwner ? "owner_admin" : "admin",
    isAdmin: true,
    isOwner: input.isOwner,
  };
}

async function readAggregateCount(query: unknown): Promise<number> {
  const maybeCount = query as {
    count?: () => { get: () => Promise<{ data: () => { count?: unknown } }> };
  };

  if (typeof maybeCount.count !== "function") {
    throw new Error("Firestore aggregate count is unavailable.");
  }

  const snapshot = await maybeCount.count().get();
  const count = snapshot.data().count;
  return typeof count === "number" && Number.isFinite(count) ? count : 0;
}

async function readAdminUsersFastSummarySnapshot() {
  const nowMs = Date.now();
  const sevenDaysAgo = nowMs - (7 * 24 * 60 * 60 * 1000);
  const usersCollection = adminDb.collection("users");
  const analyticsRollupCollection = adminDb.collection("analytics_users_rollup");
  const [
    totalUsers,
    activeUsers,
    verifiedUsers,
    pushEnabledUsers,
    onboardedUsers,
    sevenDayReturners,
    payingUsers,
    watchSessionsSnap,
    commerceSummarySnap,
  ] = await Promise.all([
    readAggregateCount(usersCollection),
    readAggregateCount(usersCollection.where("status", "==", "active")),
    readAggregateCount(usersCollection.where("isVerified", "==", true)),
    readAggregateCount(usersCollection.where("notificationSettings.browserPushEnabled", "==", true)),
    readAggregateCount(usersCollection.where("onboardingCompleted", "==", true)),
    readAggregateCount(analyticsRollupCollection.where("lastSeenAt", ">=", sevenDaysAgo)),
    readAggregateCount(analyticsRollupCollection.where("purchaseCount", ">", 0)),
    adminDb.collection("analytics_watch_sessions").limit(ADMIN_USERS_WATCH_SESSION_LIMIT).get(),
    adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
  ]);
  const commerceSummaryRaw = commerceSummarySnap.exists
    ? commerceSummarySnap.data() as Record<string, unknown>
    : {};
  let latestMetricAt = Math.max(
    toTimestampNumber(commerceSummaryRaw.updatedAt),
    toTimestampNumber(commerceSummaryRaw.generatedAt),
    toTimestampNumber(commerceSummaryRaw.lastPurchaseAt),
  );
  const watchRollup = buildWatchTimeRollupFromRecords({
    records: watchSessionsSnap.docs.map((doc) => doc.data() as Record<string, unknown>),
    views: Math.round(readMetric(commerceSummaryRaw, "unlockCount", "totalUnlocks", "unwrapCount")),
  });
  latestMetricAt = Math.max(latestMetricAt, watchRollup.latestWatchAt);
  const truthSummary = buildBehavioralTruthSummary({
    scope: "admin_metrics",
    hasValue: totalUsers > 0 || watchRollup.watchTimeMs > 0 || readMetric(commerceSummaryRaw, "grossRevenueUsdTotal", "grossRevenueUsd") > 0,
    ageMs: latestMetricAt > 0 ? Math.max(0, nowMs - latestMetricAt) : Number.MAX_SAFE_INTEGER,
    sampleCount: Math.max(
      totalUsers,
      activeUsers,
      verifiedUsers,
      pushEnabledUsers,
      onboardedUsers,
      sevenDayReturners,
      payingUsers,
      watchRollup.validSessionCount,
    ),
    requiredFieldsPresent: [
      totalUsers >= 0,
      activeUsers >= 0,
      verifiedUsers >= 0,
      sevenDayReturners >= 0,
      pushEnabledUsers >= 0,
      Math.round(readMetric(commerceSummaryRaw, "unlockCount", "totalUnlocks", "unwrapCount")) >= 0,
      Math.round(readMetric(commerceSummaryRaw, "purchaseCount", "purchaseTransactionCount")) >= 0,
      watchRollup.watchTimeMs >= 0,
      readMetric(commerceSummaryRaw, "grossRevenueUsdTotal", "grossRevenueUsd") >= 0,
    ].filter(Boolean).length,
    requiredFieldsTotal: 9,
    issues: watchRollup.issues,
    hasMaterializedRollup: commerceSummarySnap.exists,
    hasEventFacts: watchRollup.validSessionCount > 0 || sevenDayReturners > 0 || payingUsers > 0,
    hasLiveFallback: !commerceSummarySnap.exists,
    materializedLabel: "analytics_commerce_rollup+analytics_watch_sessions",
    eventFactsLabel: "analytics_users_rollup_count_aggregates+analytics_watch_sessions",
    liveFallbackLabel: "users_count_aggregates+analytics_users_rollup_count_aggregates",
  });
  const snapshot: AdminUserMetricsSnapshot = {
    totalUsers,
    activeUsers,
    verifiedUsers,
    sevenDayReturners,
    pushEnabledUsers,
    trackedUnwraps: Math.round(readMetric(commerceSummaryRaw, "unlockCount", "totalUnlocks", "unwrapCount")),
    trackedPurchases: Math.round(readMetric(commerceSummaryRaw, "purchaseCount", "purchaseTransactionCount")),
    watchTimeMs: watchRollup.watchTimeMs,
    watchTimeSource: watchRollup.source,
    watchTimeIssues: watchRollup.issues,
    watchTimeDiagnosticEstimate: watchRollup.diagnosticEstimate,
    onboardedUsers,
    totalRevenueUsd: readMetric(commerceSummaryRaw, "grossRevenueUsdTotal", "grossRevenueUsd"),
    payingUsers,
    generatedAt: nowMs,
    source: commerceSummarySnap.exists ? "hot_cache" : "live_fallback",
    freshnessState: truthSummary.freshnessState,
    truthSource: truthSummary.source,
    confidenceScore: truthSummary.confidenceScore,
    confidenceLabel: truthSummary.confidenceLabel,
    issues: truthSummary.issues,
  };

  return {
    snapshot,
    commerceSummaryRaw,
    commerceSummaryExists: commerceSummarySnap.exists,
    sourceLabel: commerceSummarySnap.exists
      ? "users_count_aggregates+analytics_users_rollup_count_aggregates+analytics_commerce_rollup+analytics_watch_sessions"
      : "users_count_aggregates+analytics_users_rollup_count_aggregates+analytics_watch_sessions",
    staleReason: snapshot.freshnessState === "stale"
      ? "Admin user metrics are showing bounded hot-cache counts, but the source is older than 5m."
      : snapshot.freshnessState === "degraded"
        ? truthSummary.issues[0] ?? "Admin user metrics are visible from bounded counts, but commerce hot-cache is unavailable."
        : null,
    confidenceScore: truthSummary.confidenceScore,
    confidenceLabel: truthSummary.confidenceLabel,
    issues: truthSummary.issues,
  };
}

function buildCreatorOnboardingActorFromMarker(marker: ActorMarker): CreatorOnboardingActor {
  return {
    id: marker.actorUid ?? marker.actorType,
    role: marker.actorType === "owner_admin" ? "owner_admin" : "admin",
    label: marker.actorEmail ?? marker.actorUid ?? "Admin",
    marker,
  };
}

type CreatorOpsAggregate = {
  followerCount: number;
  notificationsEnabledCount: number;
  activeSubscribers: number;
  openRequests: number;
  bookedCalls: number;
  pendingPayouts: number;
  openThreads: number;
  pendingDropSubmissions: number;
  totalAccruedGd: number;
  pendingCashoutGd: number;
};

type CreatorOnboardingDiagnosticEntry = {
  severity: "warn";
  message: string;
  detail: Record<string, unknown>;
};

function buildEmptyCreatorOpsAggregate(): CreatorOpsAggregate {
  return {
    followerCount: 0,
    notificationsEnabledCount: 0,
    activeSubscribers: 0,
    openRequests: 0,
    bookedCalls: 0,
    pendingPayouts: 0,
    openThreads: 0,
    pendingDropSubmissions: 0,
    totalAccruedGd: 0,
    pendingCashoutGd: 0,
  };
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function serializeUserDoc(id: string, raw: Record<string, unknown>) {
  const notificationSettings = raw.notificationSettings && typeof raw.notificationSettings === "object"
    ? raw.notificationSettings as Record<string, unknown>
    : {};
  const securityFlags = raw.securityFlags && typeof raw.securityFlags === "object"
    ? raw.securityFlags as Record<string, unknown>
    : {};
  const dailyTasksState = raw.dailyTasksState && typeof raw.dailyTasksState === "object"
    ? raw.dailyTasksState as Record<string, unknown>
    : {};
  const privacySettings = raw.privacySettings && typeof raw.privacySettings === "object"
    ? raw.privacySettings as Record<string, unknown>
    : {};

  const hydratedTasks = Array.isArray(dailyTasksState.tasks)
    ? dailyTasksState.tasks.map((task) => {
      if (!task || typeof task !== "object") {
        return task;
      }

      const sourceTask = task as Record<string, unknown>;
      const definition = typeof sourceTask.id === "string" ? BUILT_IN_DAILY_TASK_MAP[sourceTask.id] : undefined;

      return {
        ...sourceTask,
        title: typeof sourceTask.title === "string" ? sourceTask.title : definition?.title ?? "",
        subtitle: typeof sourceTask.subtitle === "string" ? sourceTask.subtitle : definition?.subtitle ?? "",
        reward: Number.isFinite(sourceTask.reward) ? Number(sourceTask.reward) : definition?.reward ?? 0,
        maxProgress: Number.isFinite(sourceTask.maxProgress)
          ? Number(sourceTask.maxProgress)
          : definition?.maxProgress ?? 1,
        eventName: typeof sourceTask.eventName === "string" ? sourceTask.eventName : definition?.eventName ?? "",
        actionType: typeof sourceTask.actionType === "string"
          ? sourceTask.actionType
          : definition?.actionType ?? "open_experiences",
        ctaLabel: typeof sourceTask.ctaLabel === "string" ? sourceTask.ctaLabel : definition?.ctaLabel ?? "Keep going",
        icon: typeof sourceTask.icon === "string" ? sourceTask.icon : definition?.icon ?? "gift",
        group: typeof sourceTask.group === "string" ? sourceTask.group : definition?.group ?? "visit",
      };
    })
    : [];

  return {
    uid: typeof raw.uid === "string" ? raw.uid : id,
    email: typeof raw.email === "string" || raw.email === null ? raw.email : null,
    displayName: typeof raw.displayName === "string" || raw.displayName === null ? raw.displayName : null,
    username: typeof raw.username === "string" ? raw.username : "",
    photoURL: typeof raw.photoURL === "string" || raw.photoURL === null ? raw.photoURL : null,
    role: (raw.role === "admin" || raw.role === "creator" || raw.role === "user" ? raw.role : "user") as "user" | "creator" | "admin",
    isVerified: raw.isVerified === true,
    gumDropsBalance: typeof raw.gumDropsBalance === "number" ? raw.gumDropsBalance : 0,
    gumDropsPurchasedBalance: typeof raw.gumDropsPurchasedBalance === "number" ? raw.gumDropsPurchasedBalance : undefined,
    gumDropsRewardBalance: typeof raw.gumDropsRewardBalance === "number" ? raw.gumDropsRewardBalance : undefined,
    unlockedContent: toStringArray(raw.unlockedContent),
    createdAt: toTimestampNumber(raw.createdAt),
    lastCheckIn: toTimestampNumber(raw.lastCheckIn),
    streakCount: typeof raw.streakCount === "number" ? raw.streakCount : 0,
    status: (raw.status === "suspended" || raw.status === "banned" || raw.status === "active" ? raw.status : "active") as "active" | "suspended" | "banned",
    statusReason: typeof raw.statusReason === "string" ? raw.statusReason : "",
    onboardingCompleted: raw.onboardingCompleted === true,
    notificationSettings: {
      inAppEnabled: notificationSettings.inAppEnabled !== false,
      browserPushEnabled: notificationSettings.browserPushEnabled === true,
      newDropAlerts: notificationSettings.newDropAlerts !== false,
      expiringSoonAlerts: notificationSettings.expiringSoonAlerts !== false,
    },
    privacySettings: {
      anonymousAnalyticsEnabled: privacySettings.anonymousAnalyticsEnabled === true,
      identifiedAnalyticsEnabled: privacySettings.identifiedAnalyticsEnabled === true,
      allowRecommendations: privacySettings.allowRecommendations === true,
      showInAnonymousStats: privacySettings.showInAnonymousStats === true,
      honorGlobalPrivacyControl: privacySettings.honorGlobalPrivacyControl !== false,
      consentUpdatedAt: Number.isFinite(privacySettings.consentUpdatedAt) ? Number(privacySettings.consentUpdatedAt) : undefined,
      globalPrivacyControl: privacySettings.globalPrivacyControl === true,
    },
    hasPrivacyConsentRecord: Boolean(raw.privacySettings && typeof raw.privacySettings === "object"),
    securityFlags: {
      ripAttempts: typeof securityFlags.ripAttempts === "number" ? securityFlags.ripAttempts : 0,
      lastViolation: typeof securityFlags.lastViolation === "string" ? securityFlags.lastViolation : undefined,
      lastViolationReason: typeof securityFlags.lastViolationReason === "string" ? securityFlags.lastViolationReason : undefined,
      lastViolationDropId: typeof securityFlags.lastViolationDropId === "string" ? securityFlags.lastViolationDropId : undefined,
      lastViolationMessage: typeof securityFlags.lastViolationMessage === "string" ? securityFlags.lastViolationMessage : undefined,
      reasonCounts: securityFlags.reasonCounts && typeof securityFlags.reasonCounts === "object"
        ? Object.fromEntries(
          Object.entries(securityFlags.reasonCounts as Record<string, unknown>)
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .map(([key, value]) => [key, Number(value)]),
        )
        : undefined,
    },
    dailyTasksState: {
      tasks: hydratedTasks,
      nextRefreshMs: toTimestampNumber(dailyTasksState.nextRefreshMs),
      lastProgressAt: toTimestampNumber(dailyTasksState.lastProgressAt),
      lastResetMs: toTimestampNumber(dailyTasksState.lastResetMs),
      lastDeadlineReminderAt: toTimestampNumber(dailyTasksState.lastDeadlineReminderAt),
      completedTaskHistory:
        dailyTasksState.completedTaskHistory && typeof dailyTasksState.completedTaskHistory === "object"
          ? dailyTasksState.completedTaskHistory as Record<string, number>
          : {},
      retiredTaskIds: toStringArray(dailyTasksState.retiredTaskIds),
    },
    creatorApplication: normalizeCreatorApplication(raw.creatorApplication),
  };
}

async function GET_handler(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const mode = request.nextUrl.searchParams.get("mode") ?? ADMIN_USERS_DEFAULT_MODE;
    const includeCreatorOps = request.nextUrl.searchParams.get("includeCreatorOps") === "1"
      || request.nextUrl.searchParams.get("section") === "creator_ops"
      || mode === "creator_ops";
    const leaderboardPage = clampPositiveInteger(Number(request.nextUrl.searchParams.get("page") ?? "1"));
    const leaderboardPageSize = clampPageSize(Number(request.nextUrl.searchParams.get("pageSize") ?? "10"));
    const leaderboardFilter = (() => {
      const rawFilter = request.nextUrl.searchParams.get("filter");
      if (
        rawFilter === "returned_7d"
        || rawFilter === "purchasers"
        || rawFilter === "unwrappers"
        || rawFilter === "low_confidence"
      ) {
        return rawFilter;
      }

      return "all";
    })() satisfies AdminBehaviorLeaderboardFilter;

    if (mode === "summary") {
      const metricsSnapshotMeta = await readAdminUsersFastSummarySnapshot();

      return NextResponse.json({
        success: true,
        loadingLane: "summary",
        summary: buildSummaryFromMetricsSnapshot({
          metricsSnapshotMeta,
          commerceSummaryRaw: metricsSnapshotMeta.commerceSummaryRaw,
          commerceSummaryExists: metricsSnapshotMeta.commerceSummaryExists,
        }),
        verification: buildServerAdminModuleVerification({
          module: "admin_users_summary",
          canonicalSource: metricsSnapshotMeta.sourceLabel,
          fallbackSource: metricsSnapshotMeta.snapshot.source === "live_fallback" ? "live_fallback" : null,
          freshnessTimestamp: metricsSnapshotMeta.snapshot.generatedAt,
          degradedReason: metricsSnapshotMeta.staleReason,
          status: metricsSnapshotMeta.snapshot.freshnessState === "degraded"
            ? "degraded"
            : metricsSnapshotMeta.snapshot.freshnessState === "stale"
              ? "stale"
              : metricsSnapshotMeta.snapshot.freshnessState === "unavailable"
                ? "failed"
                : "live",
        }),
      });
    }

    if (mode === "list") {
      const usersSnapshot = await adminDb.collection("users").orderBy("createdAt", "desc").limit(ADMIN_USERS_LIST_LIMIT).get();
      const users = usersSnapshot.docs.map((doc) => serializeUserDoc(doc.id, doc.data()));

      return NextResponse.json({
        success: true,
        loadingLane: "list",
        users,
        analyticsByUser: {},
        dropReferences: {},
        summary: null,
        verification: buildServerAdminModuleVerification({
          module: "admin_users_list",
          canonicalSource: "users",
          fallbackSource: null,
          freshnessTimestamp: Date.now(),
          status: "live",
          countComposition: {
            totalUsers: users.length,
          },
        }),
      });
    }

    if (mode === "detail") {
      const userId = readStringValue(request.nextUrl.searchParams.get("userId"));
      if (!userId) {
        return buildAdminInvalidRequestResponse("Missing userId");
      }

      const [userSnap, analyticsSnap, userDailySnapshot, watchSessionsSnapshot] = await Promise.all([
        adminDb.collection("users").doc(userId).get(),
        adminDb.collection("analytics_users_rollup").doc(userId).get(),
        adminDb.collection("analytics_user_daily").where("uid", "==", userId).limit(ADMIN_USERS_DAILY_ROLLUP_LIMIT).get(),
        adminDb.collection("analytics_watch_sessions").where("userId", "==", userId).limit(ADMIN_USERS_WATCH_SESSION_LIMIT).get(),
      ]);

      if (!userSnap.exists) {
        return buildNotFoundResponse("user", "User not found");
      }

      const user = serializeUserDoc(userSnap.id, userSnap.data() as Record<string, unknown>);
      const dailyAggregate = buildEmptyDailyAggregate();
      userDailySnapshot.docs.forEach((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        dailyAggregate.eventCount += Math.round(readMetric(raw, "eventCount"));
        dailyAggregate.sessionCount += Math.round(readMetric(raw, "sessionCount"));
        dailyAggregate.viewCount += Math.round(readMetric(raw, "viewCount"));
        dailyAggregate.engagedViewCount += Math.round(readMetric(raw, "engagedViewCount"));
        dailyAggregate.passiveViewCount += Math.round(readMetric(raw, "passiveViewCount"));
        dailyAggregate.bounceCount += Math.round(readMetric(raw, "bounceCount"));
        dailyAggregate.unwrapCount += Math.round(readMetric(raw, "unwrapCount"));
        dailyAggregate.unlockCount += Math.round(readMetric(raw, "unlockCount"));
        dailyAggregate.purchaseCount += Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
        dailyAggregate.authSuccessCount += Math.round(readMetric(raw, "authSuccessCount", "signInCount"));
        dailyAggregate.onboardingStartCount += Math.round(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount"));
        dailyAggregate.onboardingCompletionCount += Math.round(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount"));
        dailyAggregate.watchSecondsTotal += Math.round(readMetric(raw, "watchSecondsTotal"));
        dailyAggregate.loadMsTotal += Math.round(readMetric(raw, "loadMsTotal"));
        dailyAggregate.loadSampleCount += Math.round(readMetric(raw, "loadSampleCount"));
        dailyAggregate.spendGdTotal += Math.round(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"));
        dailyAggregate.revenueCentsTotal += Math.round(readMetric(raw, "revenueCentsTotal"));
        dailyAggregate.grossRevenueUsdTotal += readMetric(raw, "grossRevenueUsdTotal");
        dailyAggregate.paypalFeeUsdTotal += readMetric(raw, "paypalFeeUsdTotal");
        dailyAggregate.netRevenueUsdTotal += readMetric(raw, "netRevenueUsdTotal");
        dailyAggregate.adjustedProfitUsdTotal += readMetric(raw, "adjustedProfitUsdTotal");
        dailyAggregate.bonusValueUsdTotal += readMetric(raw, "bonusValueUsdTotal");
        dailyAggregate.bonusGumDropsTotal += Math.round(readMetric(raw, "bonusGumDropsTotal"));
        dailyAggregate.deliveredGumDropsTotal += Math.round(readMetric(raw, "deliveredGumDropsTotal"));
        dailyAggregate.paidGumDropsTotal += Math.round(readMetric(raw, "paidGumDropsTotal"));
        dailyAggregate.lastSeenAt = Math.max(dailyAggregate.lastSeenAt, toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs));
        dailyAggregate.lastPurchaseAt = Math.max(dailyAggregate.lastPurchaseAt, toTimestampNumber(raw.lastPurchaseAt));
      });

      const raw = analyticsSnap.exists ? analyticsSnap.data() as Record<string, unknown> : {};
      const mergedCommerceMetrics = buildCommerceMetricsFromRollup({
        ...dailyAggregate,
        ...raw,
        grossRevenueUsdTotal: Math.max(readMetric(raw, "grossRevenueUsdTotal"), dailyAggregate.grossRevenueUsdTotal),
        revenueCentsTotal: Math.max(readMetric(raw, "revenueCentsTotal"), dailyAggregate.revenueCentsTotal),
        purchaseCount: Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount),
        spendGdTotal: Math.max(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"), dailyAggregate.spendGdTotal),
        lastPurchaseAt: Math.max(toTimestampNumber(raw.lastPurchaseAt), dailyAggregate.lastPurchaseAt),
      });
      const watchTimeRollup = buildWatchTimeRollupFromRecords({
        records: watchSessionsSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>),
        views: Math.max(readMetric(raw, "viewCount"), dailyAggregate.viewCount),
        viewerOpenMs: Math.max(Math.round(readMetric(raw, "watchSecondsTotal") * 1000), dailyAggregate.watchSecondsTotal * 1000),
        pageDurationMs: Math.max(Math.round(readMetric(raw, "watchSecondsTotal") * 1000), dailyAggregate.watchSecondsTotal * 1000),
        viewedFileCount: Math.max(readMetric(raw, "viewCount"), dailyAggregate.viewCount),
      });
      const canonicalWatchSecondsTotal = Math.round(watchTimeRollup.watchTimeMs / 1000);
      const loadSampleCount = readMetric(raw, "loadSampleCount");
      const loadMsTotal = readMetric(raw, "loadMsTotal");
      const analytics = {
        uid: user.uid,
        username: user.username || user.displayName || user.uid,
        eventCount: Math.max(readMetric(raw, "eventCount"), dailyAggregate.eventCount),
        sessionCount: Math.max(readMetric(raw, "sessionCount"), dailyAggregate.sessionCount),
        viewCount: Math.max(readMetric(raw, "viewCount"), dailyAggregate.viewCount),
        engagedViewCount: Math.max(readMetric(raw, "engagedViewCount"), dailyAggregate.engagedViewCount),
        passiveViewCount: Math.max(readMetric(raw, "passiveViewCount"), dailyAggregate.passiveViewCount),
        bounceCount: Math.max(readMetric(raw, "bounceCount"), dailyAggregate.bounceCount),
        unwrapCount: Math.max(readMetric(raw, "unwrapCount", "unlockCount"), dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
        purchaseCount: Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount),
        authSuccessCount: Math.max(readMetric(raw, "authSuccessCount", "signInCount"), dailyAggregate.authSuccessCount),
        onboardingStartCount: Math.max(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount"), dailyAggregate.onboardingStartCount),
        onboardingCompletionCount: Math.max(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount"), dailyAggregate.onboardingCompletionCount, user.onboardingCompleted ? 1 : 0),
        watchSecondsTotal: canonicalWatchSecondsTotal,
        watchHours: Number((canonicalWatchSecondsTotal / 3600).toFixed(1)),
        avgLoadMs: Math.max(
          loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
          dailyAggregate.loadSampleCount > 0 ? Math.round(dailyAggregate.loadMsTotal / dailyAggregate.loadSampleCount) : 0,
        ),
        lastSeenAt: Math.max(toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs), dailyAggregate.lastSeenAt),
        ...mergedCommerceMetrics,
        retailValueUsd: mergedCommerceMetrics.retailValueUsd,
        bundleYieldRatio: mergedCommerceMetrics.retailValueUsd > 0
          ? Number((mergedCommerceMetrics.grossRevenueUsd / mergedCommerceMetrics.retailValueUsd).toFixed(4))
          : 0,
        commerceTruthLabel: mergedCommerceMetrics.commerceTruthLabel,
        commerceSourceLabel: mergedCommerceMetrics.commerceSourceLabel,
        commerceEmptyReason: mergedCommerceMetrics.commerceEmptyReason,
        watchTimeDiagnosticEstimate: watchTimeRollup.diagnosticEstimate,
      };
      const metricSnapshot = {
        eventCount: analytics.eventCount,
        sessionCount: analytics.sessionCount,
        viewCount: analytics.viewCount,
        bounceCount: analytics.bounceCount,
        authSuccessCount: analytics.authSuccessCount,
        onboardingCompletionCount: analytics.onboardingCompletionCount,
        watchSecondsTotal: analytics.watchSecondsTotal,
        unwrapCount: analytics.unwrapCount,
        purchaseCount: analytics.purchaseCount,
        grossRevenueUsd: analytics.grossRevenueUsd,
        unlockSpendGdTotal: analytics.unlockSpendGdTotal,
        lastSeenAt: analytics.lastSeenAt,
      };
      const metricIntegrity = buildAdminUserMetricIntegrity({
        hasRollup: analyticsSnap.exists,
        hasDaily: userDailySnapshot.docs.length > 0,
        recoveredFromFacts: false,
        userOnboarded: user.onboardingCompleted === true,
        userCreatedAt: toTimestampNumber(user.createdAt),
        nowMs: Date.now(),
        lastSeenAt: metricSnapshot.lastSeenAt,
        metrics: metricSnapshot,
      });
      const engagementInput = buildUserEngagementScoreInputFromActivityDays({
        days: userDailySnapshot.docs
          .map((doc) => doc.data() as Record<string, unknown>)
          .filter((raw) => (typeof raw.uid === "string" ? raw.uid : "") === user.uid)
          .map((raw) => buildAdminUserEngagementDay(raw)),
        nowMs: Date.now(),
      });
      const valueInputFromDays = buildUserValueScoreInputFromActivityDays({
        days: userDailySnapshot.docs
          .map((doc) => doc.data() as Record<string, unknown>)
          .filter((raw) => (typeof raw.uid === "string" ? raw.uid : "") === user.uid)
          .map((raw) => buildAdminUserValueDay(raw)),
        nowMs: Date.now(),
      });
      const behaviorRollup = buildUserBehaviorRollup({
        userId: user.uid,
        totalActions: metricSnapshot.eventCount,
        views: metricSnapshot.viewCount,
        unwraps: metricSnapshot.unwrapCount,
        watchTimeMs: watchTimeRollup.watchTimeMs,
        purchasesCount: metricSnapshot.purchaseCount,
        revenueUsd: metricSnapshot.grossRevenueUsd,
        paidGdPurchased: analytics.paidGumDrops,
        rewardGdEarned: user.gumDropsRewardBalance,
        onboardingCompleted: user.onboardingCompleted === true,
        authEvents: metricSnapshot.authSuccessCount,
        pushEnabled: user.notificationSettings?.browserPushEnabled === true,
        lastSeenAt: metricSnapshot.lastSeenAt,
        hasRollup: analyticsSnap.exists,
        hasDaily: userDailySnapshot.docs.length > 0,
        hasFacts: false,
        hasWatchSessions: isVerifiedWatchTimeRollupSource(watchTimeRollup.source),
        hasLegacyPageDuration: isLegacyWatchTimeRollupSource(watchTimeRollup.source),
        hasTransactions: false,
        identifiedAnalyticsEnabled: user.privacySettings?.identifiedAnalyticsEnabled === true,
        honorGlobalPrivacyControl: user.privacySettings?.honorGlobalPrivacyControl !== false,
        globalPrivacyControl: user.privacySettings?.globalPrivacyControl === true,
        hasPrivacySettings: user.hasPrivacyConsentRecord === true,
        commerceSourcePresent: Boolean(analytics.commerceSourceLabel),
        sourceIssues: [
          ...metricIntegrity.failures,
          ...watchTimeRollup.issues,
        ],
        engagementInput,
        valueInput: {
          ...valueInputFromDays,
          totalSpendUsd: metricSnapshot.grossRevenueUsd,
          purchaseCount: metricSnapshot.purchaseCount,
          paidGdPurchased: analytics.paidGumDrops,
          bonusGdDelivered: analytics.bonusGumDrops,
          rewardGdEarned: Math.max(valueInputFromDays.rewardGdEarned, user.gumDropsRewardBalance || 0),
          daysSinceLastPurchase: metricSnapshot.purchaseCount > 0 && analytics.lastPurchaseAt > 0
            ? Math.max(0, Math.floor((Date.now() - analytics.lastPurchaseAt) / (24 * 60 * 60 * 1000)))
            : valueInputFromDays.daysSinceLastPurchase,
        },
      });
      const engagement = behaviorRollup.engagement;
      const value = behaviorRollup.value;
      const analyticsByUser = {
        [user.uid]: {
          ...analytics,
          metricTruthLabel: metricIntegrity.truthLabel,
          metricVerificationState: metricIntegrity.verificationState,
          metricSourceLabel: metricIntegrity.sourceLabel,
          metricIntegrityFailures: metricIntegrity.failures,
          metricFreshnessMs: metricIntegrity.freshnessMs,
          recoveredFromFacts: false,
          engagementScore: engagement.score,
          engagement,
          valueScore: value.valueScore,
          value,
          behaviorRollup,
        },
      };

      return NextResponse.json({
        success: true,
        loadingLane: "selectedUser",
        users: [user],
        analyticsByUser,
        dropReferences: await getDropReferenceMap(user.unlockedContent || []),
        summary: null,
        verification: buildServerAdminModuleVerification({
          module: "admin_users_detail",
          canonicalSource: "users+analytics_users_rollup+analytics_user_daily",
          fallbackSource: null,
          freshnessTimestamp: Date.now(),
          status: metricIntegrity.truthLabel === "live"
            ? "live"
            : metricIntegrity.truthLabel === "stale"
              ? "stale"
              : "degraded",
          countComposition: {
            totalUsers: 1,
            degradedUsers: metricIntegrity.failures.length > 0 ? 1 : 0,
          },
        }),
      });
    }

    const [
      usersSnapshot,
      analyticsSnapshot,
      userDailySnapshot,
      watchSessionsSnapshot,
      commerceSummarySnap,
      creatorRelationshipsSnap,
      creatorSubscriptionsSnap,
      creatorRequestsSnap,
      creatorBookingsSnap,
      creatorPayoutsSnap,
      creatorThreadsSnap,
      creatorAccrualsSnap,
      pendingCreatorDropsSnap,
    ] = await Promise.all([
      adminDb.collection("users").orderBy("createdAt", "desc").limit(ADMIN_USERS_LIST_LIMIT).get(),
      adminDb.collection("analytics_users_rollup").limit(ADMIN_USERS_LIST_LIMIT).get(),
      adminDb.collection("analytics_user_daily").limit(ADMIN_USERS_DAILY_ROLLUP_LIMIT).get(),
      adminDb.collection("analytics_watch_sessions").limit(ADMIN_USERS_WATCH_SESSION_LIMIT).get(),
      adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.relationships).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.subscriptions).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.requests).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.bookings).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.messageThreads).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      includeCreatorOps ? adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).limit(ADMIN_USERS_CREATOR_OPS_LIMIT).get() : Promise.resolve(emptyAdminUsersQuerySnapshot()),
      adminDb.collection("drops").where("approvalStatus", "==", "pending_review").limit(ADMIN_USERS_PENDING_DROP_LIMIT).get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => serializeUserDoc(doc.id, doc.data()));
    const rollupUserIds = new Set(analyticsSnapshot.docs.map((doc) => doc.id));
    const watchSessionsByUser = new Map<string, Record<string, unknown>[]>();
    watchSessionsSnapshot.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const userId = typeof raw.userId === "string" ? raw.userId : "";
      if (!userId) {
        return;
      }

      const existingSessions = watchSessionsByUser.get(userId);
      if (existingSessions) {
        existingSessions.push(raw);
      } else {
        watchSessionsByUser.set(userId, [raw]);
      }
    });
    const creatorOpsByUser = new Map<string, CreatorOpsAggregate>();

    const readCreatorOps = (creatorId: string) => {
      const current = creatorOpsByUser.get(creatorId) ?? buildEmptyCreatorOpsAggregate();
      creatorOpsByUser.set(creatorId, current);
      return current;
    };

    creatorRelationshipsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.following === true) {
        current.followerCount += 1;
      }

      if (raw.notificationsEnabled === true) {
        current.notificationsEnabledCount += 1;
      }
    });

    creatorSubscriptionsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "active") {
        current.activeSubscribers += 1;
      }
    });

    creatorRequestsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "pending") {
        current.openRequests += 1;
      }
    });

    creatorBookingsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "booked") {
        current.bookedCalls += 1;
      }
    });

    creatorPayoutsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "pending") {
        current.pendingPayouts += 1;
        current.pendingCashoutGd += Math.round(readMetric(raw, "requestedGd"));
      }
    });

    creatorThreadsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.openThreads += 1;
    });

    creatorAccrualsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.totalAccruedGd += Math.round(readMetric(raw, "creatorShareGd"));
    });

    pendingCreatorDropsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.submittedByCreatorId === "string"
        ? raw.submittedByCreatorId
        : typeof raw.creatorId === "string"
          ? raw.creatorId
          : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.pendingDropSubmissions += 1;
    });

    const dailyAnalyticsByUser = new Map<string, UserDailyAggregate>();
    const dailyEngagementDaysByUser = new Map<string, UserEngagementActivityDay[]>();
    const dailyValueDaysByUser = new Map<string, UserValueActivityDay[]>();
    userDailySnapshot.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const uid = typeof raw.uid === "string" ? raw.uid : "";
      if (!uid) {
        return;
      }

      const current = dailyAnalyticsByUser.get(uid) ?? buildEmptyDailyAggregate();
      const engagementDays = dailyEngagementDaysByUser.get(uid) ?? [];
      const valueDays = dailyValueDaysByUser.get(uid) ?? [];
      current.eventCount += Math.round(readMetric(raw, "eventCount"));
      current.sessionCount += Math.round(readMetric(raw, "sessionCount"));
      current.viewCount += Math.round(readMetric(raw, "viewCount"));
      current.engagedViewCount += Math.round(readMetric(raw, "engagedViewCount"));
      current.passiveViewCount += Math.round(readMetric(raw, "passiveViewCount"));
      current.bounceCount += Math.round(readMetric(raw, "bounceCount"));
      current.unwrapCount += Math.round(readMetric(raw, "unwrapCount"));
      current.unlockCount += Math.round(readMetric(raw, "unlockCount"));
      current.purchaseCount += Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
      current.authSuccessCount += Math.round(readMetric(raw, "authSuccessCount", "signInCount"));
      current.onboardingStartCount += Math.round(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount"));
      current.onboardingCompletionCount += Math.round(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount"));
      current.watchSecondsTotal += Math.round(readMetric(raw, "watchSecondsTotal"));
      current.loadMsTotal += Math.round(readMetric(raw, "loadMsTotal"));
      current.loadSampleCount += Math.round(readMetric(raw, "loadSampleCount"));
      current.spendGdTotal += Math.round(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"));
      current.revenueCentsTotal += Math.round(readMetric(raw, "revenueCentsTotal"));
      current.grossRevenueUsdTotal += readMetric(raw, "grossRevenueUsdTotal");
      current.paypalFeeUsdTotal += readMetric(raw, "paypalFeeUsdTotal");
      current.netRevenueUsdTotal += readMetric(raw, "netRevenueUsdTotal");
      current.adjustedProfitUsdTotal += readMetric(raw, "adjustedProfitUsdTotal");
      current.bonusValueUsdTotal += readMetric(raw, "bonusValueUsdTotal");
      current.bonusGumDropsTotal += Math.round(readMetric(raw, "bonusGumDropsTotal"));
      current.deliveredGumDropsTotal += Math.round(readMetric(raw, "deliveredGumDropsTotal"));
      current.paidGumDropsTotal += Math.round(readMetric(raw, "paidGumDropsTotal"));
      current.rewardGdEarnedTotal += Math.round(Math.max(
        readMetric(raw, "rewardGdEarned"),
        readMetric(raw, "rewardGdEarnedTotal"),
        readMetric(raw, "rewardGumDropsEarned"),
        readMetric(raw, "rewardAmountEarned"),
        readMetric(raw, "dailyRewardGd"),
        readMetric(raw, "dailyRewardGdTotal"),
        readMetric(raw, "freeGdEarned"),
      ));
      current.lastSeenAt = Math.max(current.lastSeenAt, toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs));
      current.lastPurchaseAt = Math.max(current.lastPurchaseAt, toTimestampNumber(raw.lastPurchaseAt));
      dailyAnalyticsByUser.set(uid, current);
      engagementDays.push(buildAdminUserEngagementDay(raw));
      valueDays.push(buildAdminUserValueDay(raw));
      dailyEngagementDaysByUser.set(uid, engagementDays);
      dailyValueDaysByUser.set(uid, valueDays);
    });

    const dailyUserIds = new Set(dailyAnalyticsByUser.keys());
    const analyticsByUser: Record<string, any> = Object.fromEntries(
      analyticsSnapshot.docs.map((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        const dailyAggregate = dailyAnalyticsByUser.get(doc.id) ?? buildEmptyDailyAggregate();
        const loadSampleCount = typeof raw.loadSampleCount === "number" ? raw.loadSampleCount : 0;
        const loadMsTotal = typeof raw.loadMsTotal === "number" ? raw.loadMsTotal : 0;
        const mergedCommerceMetrics = buildCommerceMetricsFromRollup({
          ...dailyAggregate,
          ...raw,
          grossRevenueUsdTotal: Math.max(readMetric(raw, "grossRevenueUsdTotal"), dailyAggregate.grossRevenueUsdTotal),
          revenueCentsTotal: Math.max(readMetric(raw, "revenueCentsTotal"), dailyAggregate.revenueCentsTotal),
          paypalFeeUsdTotal: Math.max(readMetric(raw, "paypalFeeUsdTotal"), dailyAggregate.paypalFeeUsdTotal),
          netRevenueUsdTotal: Math.max(readMetric(raw, "netRevenueUsdTotal"), dailyAggregate.netRevenueUsdTotal),
          adjustedProfitUsdTotal: Math.max(readMetric(raw, "adjustedProfitUsdTotal"), dailyAggregate.adjustedProfitUsdTotal),
          bonusValueUsdTotal: Math.max(readMetric(raw, "bonusValueUsdTotal"), dailyAggregate.bonusValueUsdTotal),
          bonusGumDropsTotal: Math.max(readMetric(raw, "bonusGumDropsTotal"), dailyAggregate.bonusGumDropsTotal),
          deliveredGumDropsTotal: Math.max(readMetric(raw, "deliveredGumDropsTotal"), dailyAggregate.deliveredGumDropsTotal),
          paidGumDropsTotal: Math.max(readMetric(raw, "paidGumDropsTotal"), dailyAggregate.paidGumDropsTotal),
          spendGdTotal: Math.max(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"), dailyAggregate.spendGdTotal),
          purchaseCount: Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount),
          lastPurchaseAt: Math.max(toTimestampNumber(raw.lastPurchaseAt), dailyAggregate.lastPurchaseAt),
        });
        const grossRevenueUsd = mergedCommerceMetrics.grossRevenueUsd;
        const adjustedProfitUsd = mergedCommerceMetrics.adjustedProfitUsd;
        const retailValueUsd = mergedCommerceMetrics.retailValueUsd;
        const bundleYieldRatio = retailValueUsd > 0 ? Number((grossRevenueUsd / retailValueUsd).toFixed(4)) : 0;
        const purchaseCount = Math.max(
          0,
          Math.round(Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount)),
        );
        const viewCount = Math.max(
          Math.round(readMetric(raw, "viewCount")),
          dailyAggregate.viewCount,
          typeof raw.sessionCount === "number" ? raw.sessionCount : 0,
        );
        const watchTimeRollup = buildWatchTimeRollupFromRecords({
          records: watchSessionsByUser.get(doc.id) ?? [],
          views: viewCount,
          viewerOpenMs: Math.max(Math.round(readMetric(raw, "watchSecondsTotal") * 1000), dailyAggregate.watchSecondsTotal * 1000),
          pageDurationMs: Math.max(Math.round(readMetric(raw, "watchSecondsTotal") * 1000), dailyAggregate.watchSecondsTotal * 1000),
          viewedFileCount: viewCount,
        });
        const canonicalWatchSecondsTotal = Math.round(watchTimeRollup.watchTimeMs / 1000);

        return [doc.id, {
          uid: doc.id,
          username: typeof raw.username === "string" ? raw.username : doc.id,
          eventCount: Math.max(typeof raw.eventCount === "number" ? raw.eventCount : 0, dailyAggregate.eventCount),
          sessionCount: Math.max(typeof raw.sessionCount === "number" ? raw.sessionCount : 0, dailyAggregate.sessionCount),
          viewCount,
          engagedViewCount: Math.max(Math.round(readMetric(raw, "engagedViewCount")), dailyAggregate.engagedViewCount),
          passiveViewCount: Math.max(Math.round(readMetric(raw, "passiveViewCount")), dailyAggregate.passiveViewCount),
          bounceCount: Math.max(Math.round(readMetric(raw, "bounceCount")), dailyAggregate.bounceCount),
          unwrapCount: Math.max(
            Math.round(readMetric(raw, "unwrapCount", "unlockCount")),
            Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
          ),
          purchaseCount,
          authSuccessCount: Math.max(
            Math.round(readMetric(raw, "authSuccessCount", "signInCount")),
            dailyAggregate.authSuccessCount,
          ),
          onboardingStartCount: Math.max(
            Math.round(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount")),
            dailyAggregate.onboardingStartCount,
          ),
          onboardingCompletionCount: Math.max(
            Math.round(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount")),
            dailyAggregate.onboardingCompletionCount,
          ),
          watchSecondsTotal: canonicalWatchSecondsTotal,
          watchHours: Number((canonicalWatchSecondsTotal / 3600).toFixed(1)),
          avgLoadMs: Math.max(
            loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
            dailyAggregate.loadSampleCount > 0 ? Math.round(dailyAggregate.loadMsTotal / dailyAggregate.loadSampleCount) : 0,
          ),
          lastSeenAt: Math.max(typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : 0, dailyAggregate.lastSeenAt),
          grossRevenueUsd,
          grossRevenueCents: mergedCommerceMetrics.grossRevenueCents,
          paypalFeeUsd: mergedCommerceMetrics.paypalFeeUsd,
          paypalFeeCents: mergedCommerceMetrics.paypalFeeCents,
          netRevenueUsd: mergedCommerceMetrics.netRevenueUsd,
          netRevenueCents: mergedCommerceMetrics.netRevenueCents,
          adjustedProfitUsd,
          adjustedProfitCents: mergedCommerceMetrics.adjustedProfitCents,
          retailValueUsd,
          bonusValueUsd: mergedCommerceMetrics.bonusValueUsd,
          bonusGumDrops: mergedCommerceMetrics.bonusGumDrops,
          deliveredGumDrops: mergedCommerceMetrics.deliveredGumDrops,
          paidGumDrops: mergedCommerceMetrics.paidGumDrops,
          averageOrderUsd: mergedCommerceMetrics.averageOrderUsd,
          effectiveUsdPer100Gd: mergedCommerceMetrics.effectiveUsdPer100Gd,
          unlockSpendGdTotal: mergedCommerceMetrics.unlockSpendGdTotal,
          lastPurchaseAt: mergedCommerceMetrics.lastPurchaseAt,
          bundleYieldRatio,
          commerceTruthLabel: mergedCommerceMetrics.commerceTruthLabel,
          commerceSourceLabel: mergedCommerceMetrics.commerceSourceLabel,
          commerceEmptyReason: mergedCommerceMetrics.commerceEmptyReason,
          watchTimeSource: watchTimeRollup.source,
          watchTimeIssues: watchTimeRollup.issues,
          watchTimeDiagnosticEstimate: watchTimeRollup.diagnosticEstimate,
        }];
      }),
    );

    const onboardingCompletedByUser = new Map(users.map((user) => [user.uid, user.onboardingCompleted]));
    const fallbackUserIds = users
      .map((user) => user.uid)
      .filter((uid) => {
        const analytics = analyticsByUser[uid];
        return shouldRecoverAdminUserMetricsFromFacts({
          hasRollup: rollupUserIds.has(uid),
          hasDaily: dailyUserIds.has(uid),
          userOnboarded: onboardingCompletedByUser.get(uid) === true,
          metrics: analytics,
        });
      });

    const factRecoveredUserIds = new Set<string>();
    if (fallbackUserIds.length > 0) {
      const eventSnapshots = await Promise.all(
        chunkValues(fallbackUserIds, 30).map((uids) => adminDb.collection("analytics_event_facts")
          .where("userId", "in", uids)
          .limit(ADMIN_USERS_EVENT_FACT_RECOVERY_LIMIT)
          .get()),
      );

      const fallbackStats = new Map<string, {
        eventCount: number;
        sessionCount: number;
        viewCount: number;
        engagedViewCount: number;
        passiveViewCount: number;
        bounceCount: number;
        unwrapCount: number;
        authSuccessCount: number;
        onboardingStartCount: number;
        onboardingCompletionCount: number;
        watchSecondsTotal: number;
        loadMsTotal: number;
        loadSampleCount: number;
        lastSeenAt: number;
      }>();

      eventSnapshots.forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
          const raw = doc.data() as Record<string, unknown>;
          const uid = typeof raw.userId === "string" ? raw.userId : "";
          if (!uid) {
            return;
          }

          const eventName = typeof raw.eventName === "string" ? raw.eventName : "";
          const timestamp = toTimestampNumber(raw.timestamp);
          const loadMs = typeof raw.loadMs === "number" && Number.isFinite(raw.loadMs) ? raw.loadMs : 0;
          const watchSeconds = 0;

          const current = fallbackStats.get(uid) ?? {
            eventCount: 0,
            sessionCount: 0,
            viewCount: 0,
            engagedViewCount: 0,
            passiveViewCount: 0,
            bounceCount: 0,
            unwrapCount: 0,
            authSuccessCount: 0,
            onboardingStartCount: 0,
            onboardingCompletionCount: 0,
            watchSecondsTotal: 0,
            loadMsTotal: 0,
            loadSampleCount: 0,
            lastSeenAt: 0,
          };

          current.eventCount += 1;
          current.sessionCount += eventName === "viewer_session_started" ? 1 : 0;
          current.viewCount += (
            eventName === "semantic_page_viewed"
            || eventName === "home_page_viewed"
            || eventName === "privacy_page_viewed"
            || eventName === "terms_page_viewed"
            || eventName === "dashboard_viewed"
            || eventName === "library_viewed"
            || eventName === "profile_settings_viewed"
            || eventName === "experience_hub_viewed"
            || eventName === "drops_page_viewed"
            || eventName === "faq_page_viewed"
            || eventName === "admin_dashboard_viewed"
            || eventName === "admin_analytics_viewed"
            || eventName === "admin_debug_viewed"
            || eventName === "admin_users_viewed"
            || eventName === "admin_content_viewed"
            || eventName === "admin_drops_viewed"
            || eventName === "admin_queue_viewed"
            || eventName === "admin_roster_viewed"
            || eventName === "admin_user_detail_viewed"
            || eventName === "viewer_opened"
          ) ? 1 : 0;
          current.engagedViewCount += eventName === "semantic_page_engaged" ? 1 : 0;
          current.passiveViewCount += eventName === "semantic_page_passive" ? 1 : 0;
          current.bounceCount += eventName === "semantic_page_bounced" ? 1 : 0;
          current.unwrapCount += eventName === "drop_unwrapped" ? 1 : 0;
          current.authSuccessCount += (
            eventName === "auth_sign_in_success"
            || eventName === "auth_google_sign_in_success"
            || eventName === "auth_sign_up_success"
          ) ? 1 : 0;
          current.onboardingStartCount += eventName === "guided_onboarding_started" ? 1 : 0;
          current.onboardingCompletionCount += eventName === "guided_onboarding_completed" ? 1 : 0;
          current.watchSecondsTotal += watchSeconds;
          current.loadMsTotal += loadMs;
          current.loadSampleCount += loadMs > 0 ? 1 : 0;
          current.lastSeenAt = Math.max(current.lastSeenAt, timestamp);

          fallbackStats.set(uid, current);
        });
      });

      fallbackStats.forEach((stats, uid) => {
        factRecoveredUserIds.add(uid);
        const existing = analyticsByUser[uid] ?? {
          uid,
          username: users.find((user) => user.uid === uid)?.username || uid,
          eventCount: 0,
          sessionCount: 0,
          viewCount: 0,
          engagedViewCount: 0,
          passiveViewCount: 0,
          bounceCount: 0,
          unwrapCount: 0,
          purchaseCount: 0,
          authSuccessCount: 0,
          onboardingStartCount: 0,
          onboardingCompletionCount: 0,
          watchSecondsTotal: 0,
          watchHours: 0,
          avgLoadMs: 0,
          lastSeenAt: 0,
          ...buildEmptyCommerceMetrics(),
          bundleYieldRatio: 0,
        };

        analyticsByUser[uid] = {
          ...existing,
          eventCount: Math.max(existing.eventCount || 0, stats.eventCount),
          sessionCount: Math.max(existing.sessionCount || 0, stats.sessionCount),
          viewCount: Math.max(existing.viewCount || 0, stats.viewCount, stats.sessionCount),
          engagedViewCount: Math.max(existing.engagedViewCount || 0, stats.engagedViewCount),
          passiveViewCount: Math.max(existing.passiveViewCount || 0, stats.passiveViewCount),
          bounceCount: Math.max(existing.bounceCount || 0, stats.bounceCount),
          unwrapCount: Math.max(existing.unwrapCount || 0, stats.unwrapCount),
          authSuccessCount: Math.max(existing.authSuccessCount || 0, stats.authSuccessCount),
          onboardingStartCount: Math.max(existing.onboardingStartCount || 0, stats.onboardingStartCount),
          onboardingCompletionCount: Math.max(
            existing.onboardingCompletionCount || 0,
            stats.onboardingCompletionCount,
            onboardingCompletedByUser.get(uid) ? 1 : 0,
          ),
          watchSecondsTotal: Math.max(existing.watchSecondsTotal || 0, stats.watchSecondsTotal),
          watchHours: Number((Math.max(existing.watchSecondsTotal || 0, stats.watchSecondsTotal) / 3600).toFixed(1)),
          avgLoadMs: stats.loadSampleCount > 0
            ? Math.max(existing.avgLoadMs || 0, Math.round(stats.loadMsTotal / stats.loadSampleCount))
            : existing.avgLoadMs || 0,
          lastSeenAt: Math.max(existing.lastSeenAt || 0, stats.lastSeenAt),
        };
      });
    }

    users.forEach((user) => {
      if (analyticsByUser[user.uid]) {
        analyticsByUser[user.uid] = {
          ...analyticsByUser[user.uid],
          onboardingCompletionCount: Math.max(
            analyticsByUser[user.uid].onboardingCompletionCount || 0,
            user.onboardingCompleted ? 1 : 0,
          ),
        };
        return;
      }

      const dailyAggregate = dailyAnalyticsByUser.get(user.uid) ?? buildEmptyDailyAggregate();
      const commerceMetrics = buildCommerceMetricsFromRollup(dailyAggregate);
      const retailValueUsd = commerceMetrics.retailValueUsd;
      analyticsByUser[user.uid] = {
        uid: user.uid,
        username: user.username || user.displayName || user.uid,
        eventCount: dailyAggregate.eventCount,
        sessionCount: dailyAggregate.sessionCount,
        viewCount: dailyAggregate.viewCount,
        engagedViewCount: dailyAggregate.engagedViewCount,
        passiveViewCount: dailyAggregate.passiveViewCount,
        bounceCount: dailyAggregate.bounceCount,
        unwrapCount: Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
        purchaseCount: dailyAggregate.purchaseCount,
        authSuccessCount: dailyAggregate.authSuccessCount,
        onboardingStartCount: dailyAggregate.onboardingStartCount,
        onboardingCompletionCount: Math.max(dailyAggregate.onboardingCompletionCount, user.onboardingCompleted ? 1 : 0),
        watchSecondsTotal: dailyAggregate.watchSecondsTotal,
        watchHours: Number((dailyAggregate.watchSecondsTotal / 3600).toFixed(1)),
        avgLoadMs: dailyAggregate.loadSampleCount > 0 ? Math.round(dailyAggregate.loadMsTotal / dailyAggregate.loadSampleCount) : 0,
        lastSeenAt: dailyAggregate.lastSeenAt,
        grossRevenueUsd: commerceMetrics.grossRevenueUsd,
        grossRevenueCents: commerceMetrics.grossRevenueCents,
        paypalFeeUsd: commerceMetrics.paypalFeeUsd,
        paypalFeeCents: commerceMetrics.paypalFeeCents,
        netRevenueUsd: commerceMetrics.netRevenueUsd,
        netRevenueCents: commerceMetrics.netRevenueCents,
        adjustedProfitUsd: commerceMetrics.adjustedProfitUsd,
        adjustedProfitCents: commerceMetrics.adjustedProfitCents,
        retailValueUsd,
        bonusValueUsd: commerceMetrics.bonusValueUsd,
        bonusGumDrops: commerceMetrics.bonusGumDrops,
        deliveredGumDrops: commerceMetrics.deliveredGumDrops,
        paidGumDrops: commerceMetrics.paidGumDrops,
        averageOrderUsd: commerceMetrics.averageOrderUsd,
        effectiveUsdPer100Gd: commerceMetrics.effectiveUsdPer100Gd,
        unlockSpendGdTotal: commerceMetrics.unlockSpendGdTotal,
        lastPurchaseAt: commerceMetrics.lastPurchaseAt,
        bundleYieldRatio: retailValueUsd > 0 ? Number((commerceMetrics.grossRevenueUsd / retailValueUsd).toFixed(4)) : 0,
        commerceTruthLabel: commerceMetrics.commerceTruthLabel,
        commerceSourceLabel: commerceMetrics.commerceSourceLabel,
        commerceEmptyReason: commerceMetrics.commerceEmptyReason,
      };
    });

    users.forEach((user) => {
      const analytics = analyticsByUser[user.uid];
      const dailyAggregate = dailyAnalyticsByUser.get(user.uid) ?? buildEmptyDailyAggregate();
      const metricSnapshot = {
        eventCount: analytics.eventCount || 0,
        sessionCount: analytics.sessionCount || 0,
        viewCount: analytics.viewCount || 0,
        bounceCount: analytics.bounceCount || 0,
        authSuccessCount: analytics.authSuccessCount || 0,
        onboardingCompletionCount: analytics.onboardingCompletionCount || 0,
        watchSecondsTotal: analytics.watchSecondsTotal || 0,
        unwrapCount: analytics.unwrapCount || 0,
        purchaseCount: analytics.purchaseCount || 0,
        grossRevenueUsd: analytics.grossRevenueUsd || 0,
        unlockSpendGdTotal: analytics.unlockSpendGdTotal || 0,
        lastSeenAt: analytics.lastSeenAt || 0,
      };
      const metricIntegrity = buildAdminUserMetricIntegrity({
        hasRollup: rollupUserIds.has(user.uid),
        hasDaily: dailyUserIds.has(user.uid),
        recoveredFromFacts: factRecoveredUserIds.has(user.uid),
        userOnboarded: user.onboardingCompleted === true,
        userCreatedAt: toTimestampNumber(user.createdAt),
        nowMs: Date.now(),
        lastSeenAt: metricSnapshot.lastSeenAt,
        metrics: metricSnapshot,
      });
      const engagementInput = buildUserEngagementScoreInputFromActivityDays({
        days: dailyEngagementDaysByUser.get(user.uid) ?? [],
        nowMs: Date.now(),
      });
      const valueInputFromDays = buildUserValueScoreInputFromActivityDays({
        days: dailyValueDaysByUser.get(user.uid) ?? [],
        nowMs: Date.now(),
      });
      const watchBehaviorInput = buildWatchTimeRollupBehaviorInput({
        source: analytics.watchTimeSource,
        watchTimeMs: metricSnapshot.watchSecondsTotal * 1000,
        watchSecondsTotal: metricSnapshot.watchSecondsTotal,
      });
      const behaviorRollup = buildUserBehaviorRollup({
        userId: user.uid,
        totalActions: metricSnapshot.eventCount,
        views: metricSnapshot.viewCount,
        unwraps: metricSnapshot.unwrapCount,
        watchTimeMs: watchBehaviorInput.watchTimeMs,
        watchSecondsTotal: watchBehaviorInput.watchSecondsTotal,
        purchasesCount: metricSnapshot.purchaseCount,
        revenueUsd: metricSnapshot.grossRevenueUsd,
        paidGdPurchased: analytics.paidGumDrops,
        rewardGdEarned: user.gumDropsRewardBalance,
        onboardingCompleted: user.onboardingCompleted === true,
        authEvents: metricSnapshot.authSuccessCount,
        pushEnabled: user.notificationSettings?.browserPushEnabled === true,
        lastSeenAt: metricSnapshot.lastSeenAt,
        hasRollup: rollupUserIds.has(user.uid),
        hasDaily: dailyUserIds.has(user.uid),
        hasFacts: factRecoveredUserIds.has(user.uid),
        hasWatchSessions: watchBehaviorInput.hasWatchSessions,
        hasLegacyPageDuration: watchBehaviorInput.hasLegacyPageDuration,
        hasTransactions: false,
        identifiedAnalyticsEnabled: user.privacySettings?.identifiedAnalyticsEnabled === true,
        honorGlobalPrivacyControl: user.privacySettings?.honorGlobalPrivacyControl !== false,
        globalPrivacyControl: user.privacySettings?.globalPrivacyControl === true,
        hasPrivacySettings: user.hasPrivacyConsentRecord === true,
        commerceSourcePresent: Boolean(analytics.commerceSourceLabel),
        sourceIssues: [
          ...metricIntegrity.failures,
          ...(Array.isArray(analytics.watchTimeIssues) ? analytics.watchTimeIssues : []),
        ],
        engagementInput,
        valueInput: {
          ...valueInputFromDays,
          totalSpendUsd: metricSnapshot.grossRevenueUsd,
          purchaseCount: metricSnapshot.purchaseCount,
          paidGdPurchased: analytics.paidGumDrops,
          bonusGdDelivered: analytics.bonusGumDrops,
          rewardGdEarned: Math.max(valueInputFromDays.rewardGdEarned, dailyAggregate.rewardGdEarnedTotal, user.gumDropsRewardBalance || 0),
          daysSinceLastPurchase: metricSnapshot.purchaseCount > 0 && analytics.lastPurchaseAt > 0
            ? Math.max(0, Math.floor((Date.now() - analytics.lastPurchaseAt) / (24 * 60 * 60 * 1000)))
            : valueInputFromDays.daysSinceLastPurchase,
        },
      });
      const engagement = behaviorRollup.engagement;
      const value = behaviorRollup.value;

      analyticsByUser[user.uid] = {
        ...analytics,
        metricTruthLabel: metricIntegrity.truthLabel,
        metricVerificationState: metricIntegrity.verificationState,
        metricSourceLabel: metricIntegrity.sourceLabel,
        metricIntegrityFailures: metricIntegrity.failures,
        metricFreshnessMs: metricIntegrity.freshnessMs,
        recoveredFromFacts: metricIntegrity.recoveredFromFacts,
        engagementScore: engagement.score,
        engagement,
        valueScore: value.valueScore,
        value,
        behaviorRollup,
      };
    });

    const metricFailureUsers = Object.values(analyticsByUser).filter((entry) => (entry.metricIntegrityFailures || []).length > 0);
    const recoveredMetricUsers = Object.values(analyticsByUser).filter((entry) => entry.recoveredFromFacts === true).length;
    if (metricFailureUsers.length > 0) {
      recordServerDiagnostic({
        channel: "analytics",
        severity: "warn",
        message: "Admin user metrics contain partial source-of-truth coverage",
        detail: {
          route: "admin/users",
          affectedUsers: metricFailureUsers.length,
          recoveredFromFacts: recoveredMetricUsers,
          sampleFailures: metricFailureUsers.slice(0, 5).map((entry) => ({
            uid: entry.uid,
            failures: entry.metricIntegrityFailures,
          })),
        },
      }).catch(() => undefined);
    }

    const unlockedDropIds = users.flatMap((user) => user.unlockedContent || []);
    const dropReferences = await getDropReferenceMap(unlockedDropIds);

    const nowMs = Date.now();
    const commerceSummaryRaw = commerceSummarySnap.exists
      ? commerceSummarySnap.data() as Record<string, unknown>
      : {};
    const commerceSummaryMetrics = commerceSummarySnap.exists
      ? buildCommerceMetricsFromRollup(commerceSummaryRaw)
      : buildEmptyCommerceMetrics();
    const unlockSpendGdTotal = Math.max(
      Math.round(readMetric(commerceSummaryRaw, "unlockSpendGdTotal", "spendGdTotal")),
      Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.unlockSpendGdTotal || 0), 0),
    );
    const metricsSnapshotMeta = buildAdminUserMetricsSnapshot({
      users,
      analyticsByUser,
      commerceSummaryRaw,
      commerceSummaryExists: commerceSummarySnap.exists,
      generatedAt: nowMs,
      source: commerceSummarySnap.exists ? "hot_cache" : "live_fallback",
      degraded: metricFailureUsers.length > 0,
    });
    const userMetricsSnapshot = metricsSnapshotMeta.snapshot;
    const userTruthSnapshot = toAdminUserTruthSnapshot(metricsSnapshotMeta);

    const summaryBase: Omit<UsersSummary, "kpiCards" | "creatorOps"> = {
      totalUsers: userMetricsSnapshot.totalUsers,
      totalCreators: users.filter((user) => user.role === "creator").length,
      totalAdmins: users.filter((user) => user.role === "admin").length,
      verifiedUsers: userMetricsSnapshot.verifiedUsers,
      activeUsers: userMetricsSnapshot.activeUsers,
      suspendedUsers: users.filter((user) => user.status === "suspended").length,
      bannedUsers: users.filter((user) => user.status === "banned").length,
      notificationsEnabledUsers: userMetricsSnapshot.pushEnabledUsers,
      onboardingCompletedUsers: userMetricsSnapshot.onboardedUsers,
      activeLast7Days: userMetricsSnapshot.sevenDayReturners,
      returnedInLast7Days: userMetricsSnapshot.sevenDayReturners,
      totalEvents: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.eventCount || 0), 0),
      totalUnwraps: userMetricsSnapshot.trackedUnwraps,
      totalPurchases: userMetricsSnapshot.trackedPurchases,
      totalWatchHours: Number(
        (
          userMetricsSnapshot.watchTimeMs / 3_600_000
        ).toFixed(1),
      ),
      grossRevenueUsd: userMetricsSnapshot.totalRevenueUsd,
      adjustedProfitUsd: commerceSummaryMetrics.adjustedProfitUsd,
      bonusValueUsd: commerceSummaryMetrics.bonusValueUsd,
      bonusGumDrops: commerceSummaryMetrics.bonusGumDrops,
      deliveredGumDrops: commerceSummaryMetrics.deliveredGumDrops,
      paidGumDrops: commerceSummaryMetrics.paidGumDrops,
      unlockSpendGdTotal,
      averageOrderUsd: (() => {
        return userMetricsSnapshot.trackedPurchases > 0 ? roundCurrency(userMetricsSnapshot.totalRevenueUsd / userMetricsSnapshot.trackedPurchases) : 0;
      })(),
      effectiveUsdPer100Gd: (() => {
        return commerceSummaryMetrics.deliveredGumDrops > 0
          ? roundCurrency(userMetricsSnapshot.totalRevenueUsd / (commerceSummaryMetrics.deliveredGumDrops / 100))
          : 0;
      })(),
      payingUsers: userMetricsSnapshot.payingUsers,
      commerceTruthLabel: commerceSummaryMetrics.commerceTruthLabel,
      commerceSourceLabel: commerceSummaryMetrics.commerceSourceLabel,
      commerceEmptyReason: commerceSummaryMetrics.commerceEmptyReason,
      metricsSnapshot: userMetricsSnapshot,
      truthSnapshot: userTruthSnapshot,
    };
    const summary: UsersSummary = {
      ...summaryBase,
      kpiCards: buildAdminUsersKpiCards({ summary: summaryBase }),
      creatorOps: {
        creatorsWithFollowers: Array.from(creatorOpsByUser.values()).filter((entry) => entry.followerCount > 0).length,
        totalFollowers: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.followerCount, 0),

        totalAlertOptIns: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.notificationsEnabledCount, 0),
        activeSubscriptions: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.activeSubscribers, 0),
        openRequests: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.openRequests, 0),
        bookedCalls: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.bookedCalls, 0),
        pendingPayouts: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingPayouts, 0),
        openThreads: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.openThreads, 0),
        pendingDropSubmissions: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingDropSubmissions, 0),
        totalAccruedGd: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.totalAccruedGd, 0),
        pendingCashoutGd: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingCashoutGd, 0),
      },
    };

    const behaviorLeaderboard = buildBehaviorLeaderboardPanel({
      users,
      analyticsByUser,
      page: leaderboardPage,
      pageSize: leaderboardPageSize,
      filter: leaderboardFilter,
      generatedAtMs: nowMs,
    });

    if (mode === "behavior_leaderboard") {
      return NextResponse.json({
        success: true,
        loadingLane: "behavioralDetail",
        behaviorLeaderboard,
        verification: buildServerAdminModuleVerification({
          module: "admin_users_behavior_leaderboard",
          canonicalSource: "users+analytics_users_rollup+analytics_user_daily+analytics_watch_sessions",
          fallbackSource: behaviorLeaderboard.sourceTruth === "partial" ? "live_fallback" : null,
          freshnessTimestamp: nowMs,
          degradedReason: behaviorLeaderboard.sourceFreshness !== "live"
            ? behaviorLeaderboard.warnings[0] ?? "Behavior leaderboard is using partial or stale behavior truth."
            : null,
          status: behaviorLeaderboard.sourceFreshness === "live"
            ? "live"
            : behaviorLeaderboard.sourceFreshness === "stale"
              ? "stale"
              : "degraded",
          countComposition: {
            totalUsers: users.length,
            eligibleUsers: behaviorLeaderboard.totalEligibleUsers,
            returnedRows: behaviorLeaderboard.rows.length,
          },
        }),
      });
    }

    const responseData: AdminUsersResponse & {
      creatorOpsSourceState: "loaded" | "deferred";
    } = {
      success: true,
      users,
      analyticsByUser,
      creatorOpsByUser: Object.fromEntries(creatorOpsByUser),
      creatorOpsSourceState: includeCreatorOps ? "loaded" : "deferred",
      dropReferences,
      summary,
      behaviorLeaderboard,
      verification: buildServerAdminModuleVerification({
        module: "admin_users",
        canonicalSource: "users+analytics_users_rollup+analytics_user_daily",
        fallbackSource: factRecoveredUserIds.size > 0 ? "analytics_event_facts" : null,
        freshnessTimestamp: Math.max(
          Date.now(),
          ...Object.values(analyticsByUser).map((entry) => Number(entry.lastSeenAt) || 0),
        ),
        degradedReason: metricFailureUsers.length > 0
          ? `${metricFailureUsers.length} user metric snapshots are degraded`
          : null,
        status: metricFailureUsers.length > 0
          ? "degraded"
          : factRecoveredUserIds.size > 0
            ? "fallback"
            : "live",
        countComposition: {
          totalUsers: users.length,
          degradedUsers: metricFailureUsers.length,
          recoveredUsers: recoveredMetricUsers,
        },
      }),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error, "Admin.Users.GET");
  }
}

async function PUT_handler(request: NextRequest) {
  try {
    const authResult = await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: ADMIN_USERS_BODY_LIMIT_BYTES,
      routeName: "admin/users",
      allowEmpty: false,
    });
    if (!isAdminUsersRequestRecord(rawBody)) {
      return buildAdminInvalidRequestResponse("Request body must be a JSON object");
    }
    const userId = typeof rawBody.userId === "string" ? rawBody.userId : undefined;
    const updates = isAdminUsersRequestRecord(rawBody.updates) ? rawBody.updates : undefined;

    if (!userId || !updates) {
      return buildAdminInvalidRequestResponse("Missing userId or updates");
    }

    const allowedFields = ["role", "isVerified", "status", "statusReason"];
    const sanitized: Record<string, unknown> = {};
    let creatorApplicationPatch: Record<string, unknown> | undefined;
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }
    if (updates.creatorRestrictions && typeof updates.creatorRestrictions === "object") {
      sanitized.creatorRestrictions = sanitizeCreatorRestrictionsUpdate(updates.creatorRestrictions as Record<string, unknown>);
    }
    if (updates.creatorSettings && typeof updates.creatorSettings === "object") {
      sanitized.creatorSettings = sanitizeCreatorSettingsUpdate(updates.creatorSettings as Record<string, unknown>);
    }
    if (updates.creatorApplication && typeof updates.creatorApplication === "object") {
      creatorApplicationPatch = updates.creatorApplication as Record<string, unknown>;
    }

    if (Object.keys(sanitized).length === 0 && !creatorApplicationPatch) {
      return buildAdminInvalidRequestResponse("No valid fields to update");
    }

    const isOwnerActor = isCreatorOwnerEmail(authResult?.email);
    if (sanitized.role === "admin" && !isOwnerActor) {
      return NextResponse.json({
        error: "Only the owner admin can grant admin access.",
      }, { status: 403 });
    }

    const creatorActorMarker = assertKnownActor(buildAdminOnBehalfMarker(
      buildAdminUsersActor({
        uid: authResult?.uid,
        email: authResult?.email,
        isOwner: isOwnerActor,
      }),
      userId,
      {
        surface: "creator_account_admin",
        route: "/api/admin/users",
        actionKey: Object.prototype.hasOwnProperty.call(creatorApplicationPatch ?? {}, "ownerOverrideActive")
          ? "owner_override_creator_onboarding_update"
          : "admin_creator_onboarding_update",
        source: "admin_users_put",
        performedAs: Object.prototype.hasOwnProperty.call(creatorApplicationPatch ?? {}, "ownerOverrideActive")
          ? "owner_override"
          : "admin_on_behalf",
        targetCreatorId: userId,
      },
    ));
    const actor: CreatorOnboardingActor = buildCreatorOnboardingActorFromMarker(creatorActorMarker);
    const nowMs = Date.now();
    let creatorLifecycleEvents: ReturnType<typeof buildCreatorLifecycleEvents> = [];
    let creatorLifecycleState: {
      onboardingStatus?: string;
      legalStatus?: string;
      agreementVersion?: string;
    } = {};
    let creatorOnboardingDiagnostic: CreatorOnboardingDiagnosticEntry | null = null;

    if (creatorApplicationPatch) {
      const userRef = adminDb.collection("users").doc(userId);
      const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);

      await adminDb.runTransaction(async (transaction) => {
        const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
        if (!userSnap.exists) {
          throw new Error("User not found");
        }

        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const existingCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const currentCanonical = existingCanonical ?? (existingProjection
          ? buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : undefined,
            displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
            role: readUserRole(userData.role),
            createdAt: toTimestampNumber(userData.createdAt) || existingProjection.submittedAt,
            queuePosition: existingProjection.queuePosition,
            creatorDisplayName: existingProjection.creatorDisplayName,
            creatorPrimaryPlatform: existingProjection.creatorPrimaryPlatform,
            creatorContentFocus: existingProjection.creatorContentFocus,
            nowMs,
            source: existingProjection,
          })
          : buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : undefined,
            displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
            role: readUserRole(userData.role),
            createdAt: toTimestampNumber(userData.createdAt) || nowMs,
            queuePosition: typeof creatorApplicationPatch.queuePosition === "number" && Number.isFinite(creatorApplicationPatch.queuePosition)
              ? Math.trunc(creatorApplicationPatch.queuePosition)
              : 1,
            creatorDisplayName: readStringValue(creatorApplicationPatch.creatorDisplayName)
              || readStringValue(userData.displayName)
              || "Creator",
            creatorPrimaryPlatform: readStringValue(creatorApplicationPatch.creatorPrimaryPlatform) || undefined,
            creatorContentFocus: readStringValue(creatorApplicationPatch.creatorContentFocus) || undefined,
            nowMs,
            source: creatorApplicationPatch,
          }));

        const creatorApplicationUpdate = resolveCreatorApplicationUpdate({
          patch: creatorApplicationPatch,
          currentProjection: existingProjection,
          currentCanonical,
          nowMs,
          reviewedBy: authResult?.email ?? authResult?.uid ?? null,
        });

        const nextSource = buildCreatorApplicationAdminSource(
          currentCanonical,
          creatorApplicationUpdate,
          nowMs,
          actor.label,
        );

        if (
          Object.prototype.hasOwnProperty.call(creatorApplicationPatch, "ownerOverrideActive")
          && creatorApplicationUpdate.ownerOverrideActive !== currentCanonical.ownerOverrideActive
          && !isOwnerActor
        ) {
          throw new ForbiddenCreatorOnboardingActionError("Owner override is restricted to the primary owner control.");
        }

        let nextCanonical = buildCreatorOnboardingCanonicalRecord({
          userId,
          email: typeof userData.email === "string" ? userData.email : null,
          username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
          displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
          photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
          role: readUserRole(userData.role),
          createdAt: currentCanonical.createdAt,
          queuePosition: currentCanonical.queuePosition,
          creatorDisplayName: creatorApplicationUpdate.creatorDisplayName,
          creatorPrimaryPlatform: creatorApplicationUpdate.creatorPrimaryPlatform,
          creatorContentFocus: creatorApplicationUpdate.creatorContentFocus,
          nowMs,
          source: nextSource,
        });

        const shouldPromoteCreatorRole = shouldActivateCreatorRole(nextCanonical);
        if (
          nextCanonical.approvalStatus === "creator_approved"
          && !shouldPromoteCreatorRole
          && nextCanonical.ownerOverrideActive !== true
        ) {
          await trackServerEvent("creator_role_activation_blocked", {
            page_path: `/admin/user/${userId}`,
            onboarding_status: nextCanonical.submissionStatus,
            legal_status: nextCanonical.legalStatus,
            agreement_version: nextCanonical.contractVersion ?? "",
            ...actorMarkerToTelemetryPayload(creatorActorMarker),
          }, userId).catch(() => undefined);
          throw new InvalidCreatorOnboardingTransitionError("Creator approval requires intro acknowledgment, accepted identity verification, and both agreement signatures unless owner override is active.");
        }

        const currentRole = readUserRole(userData.role);
        const requestedRole = sanitized.role !== undefined ? readUserRole(sanitized.role) : undefined;
        let nextRole = currentRole;

        if (requestedRole === "admin" || requestedRole === "user") {
          nextRole = requestedRole;
        } else if (requestedRole === "creator") {
          nextRole = shouldPromoteCreatorRole || currentRole === "creator" ? "creator" : currentRole;
        } else if (shouldPromoteCreatorRole && currentRole === "user") {
          nextRole = "creator";
        }

        if (nextRole !== nextCanonical.role) {
          nextCanonical = buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
            displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
            role: nextRole,
            createdAt: currentCanonical.createdAt,
            queuePosition: currentCanonical.queuePosition,
            creatorDisplayName: creatorApplicationUpdate.creatorDisplayName,
            creatorPrimaryPlatform: creatorApplicationUpdate.creatorPrimaryPlatform,
            creatorContentFocus: creatorApplicationUpdate.creatorContentFocus,
            nowMs,
            source: {
              ...nextSource,
              role: nextRole,
            },
          });
        }

        syncCreatorOnboardingDocuments(transaction, {
          userId,
          displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
          canonical: nextCanonical,
        });

        const userPatch: Record<string, unknown> = {
          ...sanitized,
        };
        delete userPatch.role;
        if (requestedRole || nextRole !== currentRole) {
          userPatch.role = nextRole;
        }
        if (Object.keys(userPatch).length > 0) {
          transaction.set(userRef, userPatch, { merge: true });
        }

        recordCreatorOnboardingHistoryEntries(
          transaction,
          userId,
          buildCreatorOnboardingStatusChangeHistoryEntries({
            before: currentCanonical,
            after: nextCanonical,
            actor,
            timestamp: nowMs,
          }),
        );

        creatorLifecycleEvents = buildCreatorLifecycleEvents({
          before: currentCanonical,
          after: nextCanonical,
        });
        creatorLifecycleState = {
          onboardingStatus: nextCanonical.submissionStatus,
          legalStatus: nextCanonical.legalStatus,
          agreementVersion: nextCanonical.contractVersion,
        };

        if (
          (requestedRole === "creator" && nextRole !== "creator")
          || (nextCanonical.approvalStatus === "creator_approved" && !shouldPromoteCreatorRole)
        ) {
          creatorOnboardingDiagnostic = {
            severity: "warn",
            message: requestedRole === "creator" && nextRole !== "creator"
              ? "Creator role activation blocked by onboarding prerequisites"
              : "Creator approved but role activation prerequisites are incomplete",
            detail: {
              userId,
              requestedRole: requestedRole ?? null,
              currentRole,
              nextRole,
              approvalStatus: nextCanonical.approvalStatus,
              legalStatus: nextCanonical.legalStatus,
              idVerificationStatus: nextCanonical.idVerificationStatus,
              contractDocumentStatus: nextCanonical.contractDocumentStatus,
              creatorSignatureStatus: nextCanonical.creatorSignatureStatus,
              adminSignatureStatus: nextCanonical.adminSignatureStatus,
            },
          };
        }
      });
    } else if (Object.keys(sanitized).length > 0) {
      const requestedRole = sanitized.role !== undefined ? readUserRole(sanitized.role) : undefined;

      if (requestedRole === "creator") {
        const userRef = adminDb.collection("users").doc(userId);
        const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
        const [userSnap, onboardingSnap] = await Promise.all([
          userRef.get(),
          onboardingRef.get(),
        ]);

        if (!userSnap.exists) {
          return buildNotFoundResponse("user", "User not found");
        }

        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const currentCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data())
          ?? (existingProjection
            ? buildCreatorOnboardingCanonicalRecord({
              userId,
              email: typeof userData.email === "string" ? userData.email : null,
              username: typeof userData.username === "string" ? userData.username : undefined,
              displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
              photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
              role: readUserRole(userData.role),
              createdAt: toTimestampNumber(userData.createdAt) || existingProjection.submittedAt,
              queuePosition: existingProjection.queuePosition,
              creatorDisplayName: existingProjection.creatorDisplayName,
              creatorPrimaryPlatform: existingProjection.creatorPrimaryPlatform,
              creatorContentFocus: existingProjection.creatorContentFocus,
              nowMs,
              source: existingProjection,
            })
            : undefined);

        if (currentCanonical) {
          if (!shouldActivateCreatorRole(currentCanonical)) {
            await trackServerEvent("creator_role_activation_blocked", {
              page_path: `/admin/user/${userId}`,
              onboarding_status: currentCanonical.submissionStatus,
              legal_status: currentCanonical.legalStatus,
              agreement_version: currentCanonical.contractVersion ?? "",
              ...actorMarkerToTelemetryPayload(creatorActorMarker),
            }, userId).catch(() => undefined);
            await recordServerDiagnostic({
              channel: "creator_onboarding",
              severity: "warn",
              message: "Creator role activation blocked by onboarding prerequisites",
              detail: {
                userId,
                requestedRole,
                currentRole: readUserRole(userData.role),
                approvalStatus: currentCanonical.approvalStatus,
                legalStatus: currentCanonical.legalStatus,
                idVerificationStatus: currentCanonical.idVerificationStatus,
                contractDocumentStatus: currentCanonical.contractDocumentStatus,
                creatorSignatureStatus: currentCanonical.creatorSignatureStatus,
                adminSignatureStatus: currentCanonical.adminSignatureStatus,
                ...buildActorMarkerDebugFields(creatorActorMarker),
              },
            });

            return buildAdminInvalidRequestResponse(
              "Creator role cannot be activated until intro acknowledgment, ID verification, and agreement signatures are complete.",
            );
          }

          if (readUserRole(userData.role) !== "creator") {
            await adminDb.runTransaction(async (transaction) => {
              const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId,
                email: typeof userData.email === "string" ? userData.email : null,
                username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
                displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
                photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
                role: "creator",
                createdAt: currentCanonical.createdAt,
                queuePosition: currentCanonical.queuePosition,
                creatorDisplayName: currentCanonical.creatorDisplayName,
                creatorPrimaryPlatform: currentCanonical.creatorPrimaryPlatform,
                creatorContentFocus: currentCanonical.creatorContentFocus,
                nowMs,
                source: {
                  ...currentCanonical,
                  role: "creator",
                  creatorReviewQueueVisible: undefined,
                },
              });

              syncCreatorOnboardingDocuments(transaction, {
                userId,
                displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
                canonical: nextCanonical,
              });

              const userPatch: Record<string, unknown> = {
                ...sanitized,
                role: "creator",
              };
              transaction.set(userRef, userPatch, { merge: true });
              recordCreatorOnboardingHistoryEntries(
                transaction,
                userId,
                buildCreatorOnboardingStatusChangeHistoryEntries({
                  before: currentCanonical,
                  after: nextCanonical,
                  actor,
                  timestamp: nowMs,
                }),
              );
            });
          } else {
            await userRef.update(sanitized);
          }
        } else {
          await userRef.update(sanitized);
        }
      } else {
        await adminDb.collection("users").doc(userId).update(sanitized);
      }
    }

    const creatorOnboardingDiagnosticEntry = creatorOnboardingDiagnostic as CreatorOnboardingDiagnosticEntry | null;
    if (creatorOnboardingDiagnosticEntry) {
      await recordServerDiagnostic({
        channel: "creator_onboarding",
        severity: creatorOnboardingDiagnosticEntry.severity,
        message: creatorOnboardingDiagnosticEntry.message,
        detail: {
          ...creatorOnboardingDiagnosticEntry.detail,
          ...buildActorMarkerDebugFields(creatorActorMarker),
        },
      });
    }

    await emitCreatorLifecycleTelemetry(creatorLifecycleEvents, userId, creatorActorMarker, creatorLifecycleState);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        code: error.code,
        error: error.message,
        retryable: false,
      }, { status: error.status });
    }
    if (error instanceof InvalidCreatorApplicationUpdateError) {
      return buildAdminInvalidRequestResponse(error.message);
    }

    if (error instanceof InvalidCreatorOnboardingTransitionError) {
      return buildAdminInvalidRequestResponse(error.message);
    }

    if (error instanceof ForbiddenCreatorOnboardingActionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return handleApiError(error, "Admin.Users.PUT");
  }
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: ADMIN_USERS_BODY_LIMIT_BYTES,
      routeName: "admin/users",
      allowEmpty: false,
    });
    if (!isAdminUsersRequestRecord(rawBody)) {
      return buildAdminInvalidRequestResponse("Request body must be a JSON object");
    }
    const userId = typeof rawBody.userId === "string" ? rawBody.userId : undefined;
    const action = typeof rawBody.action === "string" ? rawBody.action : undefined;
    const dropId = rawBody.dropId;

    if (!userId || !action || !dropId) {
      return buildAdminInvalidRequestResponse("Missing required fields");
    }

    const normalizedDropId = String(dropId).trim();
    const dropReferences = await getDropReferenceMap([normalizedDropId]);
    const dropReference = dropReferences[normalizedDropId];
    if (!dropReference) {
      return buildNotFoundResponse("drop", "Drop not found");
    }

    const userRef = adminDb.collection("users").doc(userId);
    const dropRef = adminDb.collection("drops").doc(normalizedDropId);

    if (action !== "add" && action !== "remove") {
      return buildAdminInvalidRequestResponse("Invalid action");
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const [userSnap, dropSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(dropRef),
      ]);

      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      if (!dropSnap.exists) {
        throw new Error("Drop not found");
      }

      const userData = userSnap.data() as Record<string, unknown>;
      const currentBalance = normalizeGumdropBalance(userData.gumDropsBalance);
      const unlockedContent = Array.isArray(userData.unlockedContent)
        ? userData.unlockedContent.filter((entry): entry is string => typeof entry === "string")
        : [];
      const alreadyUnlocked = unlockedContent.includes(normalizedDropId);
      const dropData = dropSnap.data() as Record<string, unknown>;
      const dropTitle = typeof dropData.title === "string" ? dropData.title : dropReference.title;

      if (action === "add") {
        if (alreadyUnlocked) {
        return {
          changed: false,
          actionTaken: "add" as const,
          grantedAt: null,
          dropTitle,
          creatorId: typeof dropData.creatorId === "string" ? dropData.creatorId : "",
          entitlementId: `drop-entitlement:${userId}:${normalizedDropId}`,
          transactionId: "",
        };
      }

      const grantedAt = Date.now();
      const transactionRef = adminDb.collection("transactions").doc();
      const transactionId = transactionRef.id;
      const entitlementId = `drop-entitlement:${userId}:${normalizedDropId}`;
        transaction.update(userRef, {
          unlockedContent: FieldValue.arrayUnion(normalizedDropId),
          [`unlockedContentTimestamps.${normalizedDropId}`]: grantedAt,
        });
        transaction.update(dropRef, {
          totalUnlocks: FieldValue.increment(1),
        });
        transaction.set(transactionRef, buildCompletedGumdropTransaction({
          userId,
          type: "unlock_content",
          amount: 0,
          relatedDropId: normalizedDropId,
          description: `Admin granted: ${dropTitle}`,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          timestampMs: grantedAt,
          extra: {
            grantSource: "admin",
            sourceTruth: "server",
            entitlementId,
            transactionId,
          },
        }));

        return {
          changed: true,
          actionTaken: "add" as const,
          grantedAt,
          dropTitle,
          creatorId: typeof dropData.creatorId === "string" ? dropData.creatorId : "",
          entitlementId,
          transactionId,
        };
      }

      if (!alreadyUnlocked) {
        return {
          changed: false,
          actionTaken: "remove" as const,
          grantedAt: null,
          dropTitle,
          creatorId: typeof dropData.creatorId === "string" ? dropData.creatorId : "",
          entitlementId: `drop-entitlement:${userId}:${normalizedDropId}`,
          transactionId: "",
        };
      }

      transaction.update(userRef, {
        unlockedContent: FieldValue.arrayRemove(normalizedDropId),
        [`unlockedContentTimestamps.${normalizedDropId}`]: FieldValue.delete(),
      });

      return { changed: true, actionTaken: "remove" as const, grantedAt: null, dropTitle };
    });

    if (result.changed && result.actionTaken === "add") {
      await trackServerEvent("entitlement_granted", {
        actor_type: "admin",
        actor_admin_id: caller?.uid ?? "",
        drop_id: normalizedDropId,
        drop_title: result.dropTitle,
        creator_id: result.creatorId,
        target_creator_id: result.creatorId,
        target_user_id: userId,
        entitlement_id: result.entitlementId,
        entitlement_kind: "drop_unlock",
        price_gd: 0,
        grant_source: "admin",
        transaction_id: result.transactionId || `admin-grant:${userId}:${normalizedDropId}:${result.grantedAt ?? "unknown"}`,
        sourceTruth: "server",
        page_path: `/admin/user/${userId}`,
      }, caller?.uid).catch((error) => {
        recordRouteWarning("admin/users", "Failed to mirror admin grant into analytics facts", error, {
          channel: "analytics",
          detail: {
            userId,
            dropId: normalizedDropId,
          },
        });
      });
    }

    return NextResponse.json({ success: true, dropReference, changed: result.changed });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        code: error.code,
        error: error.message,
        retryable: false,
      }, { status: error.status });
    }
    if (error instanceof Error && error.message === "User not found") {
      return buildNotFoundResponse("user", "User not found");
    }
    return handleApiError(error, "Admin.Users.POST");
  }
}
type UserDailyAggregate = {
  eventCount: number;
  sessionCount: number;
  viewCount: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  unwrapCount: number;
  unlockCount: number;
  purchaseCount: number;
  authSuccessCount: number;
  onboardingStartCount: number;
  onboardingCompletionCount: number;
  watchSecondsTotal: number;
  loadMsTotal: number;
  loadSampleCount: number;
  spendGdTotal: number;
  revenueCentsTotal: number;
  grossRevenueUsdTotal: number;
  paypalFeeUsdTotal: number;
  netRevenueUsdTotal: number;
  adjustedProfitUsdTotal: number;
  bonusValueUsdTotal: number;
  bonusGumDropsTotal: number;
  deliveredGumDropsTotal: number;
  paidGumDropsTotal: number;
  rewardGdEarnedTotal: number;
  lastSeenAt: number;
  lastPurchaseAt: number;
};

function buildSummaryFromMetricsSnapshot(input: {
  users?: Array<ReturnType<typeof serializeUserDoc>>;
  metricsSnapshotMeta: AdminUserMetricsSnapshotMetadata;
  commerceSummaryRaw?: Record<string, unknown>;
  commerceSummaryExists?: boolean;
}): UsersSummary {
  const users = input.users ?? [];
  const userMetricsSnapshot = input.metricsSnapshotMeta.snapshot;
  const userTruthSnapshot = toAdminUserTruthSnapshot(input.metricsSnapshotMeta);
  const commerceSummaryRaw = input.commerceSummaryRaw ?? {};
  const commerceSummaryMetrics = input.commerceSummaryExists
    ? buildCommerceMetricsFromRollup(commerceSummaryRaw)
    : buildEmptyCommerceMetrics();
  const unlockSpendGdTotal = Math.max(
    Math.round(readMetric(commerceSummaryRaw, "unlockSpendGdTotal", "spendGdTotal")),
    commerceSummaryMetrics.unlockSpendGdTotal,
  );

  const summaryBase: Omit<UsersSummary, "kpiCards" | "creatorOps"> = {
    totalUsers: userMetricsSnapshot.totalUsers,
    totalCreators: users.filter((user) => user.role === "creator").length,
    totalAdmins: users.filter((user) => user.role === "admin").length,
    verifiedUsers: userMetricsSnapshot.verifiedUsers,
    activeUsers: userMetricsSnapshot.activeUsers,
    suspendedUsers: users.filter((user) => user.status === "suspended").length,
    bannedUsers: users.filter((user) => user.status === "banned").length,
    notificationsEnabledUsers: userMetricsSnapshot.pushEnabledUsers,
    onboardingCompletedUsers: userMetricsSnapshot.onboardedUsers,
    activeLast7Days: userMetricsSnapshot.sevenDayReturners,
    returnedInLast7Days: userMetricsSnapshot.sevenDayReturners,
    totalEvents: 0,
    totalUnwraps: userMetricsSnapshot.trackedUnwraps,
    totalPurchases: userMetricsSnapshot.trackedPurchases,
    totalWatchHours: Number((userMetricsSnapshot.watchTimeMs / 3_600_000).toFixed(1)),
    grossRevenueUsd: userMetricsSnapshot.totalRevenueUsd,
    adjustedProfitUsd: commerceSummaryMetrics.adjustedProfitUsd,
    bonusValueUsd: commerceSummaryMetrics.bonusValueUsd,
    bonusGumDrops: commerceSummaryMetrics.bonusGumDrops,
    deliveredGumDrops: commerceSummaryMetrics.deliveredGumDrops,
    paidGumDrops: commerceSummaryMetrics.paidGumDrops,
    unlockSpendGdTotal,
    averageOrderUsd: userMetricsSnapshot.trackedPurchases > 0
      ? roundCurrency(userMetricsSnapshot.totalRevenueUsd / userMetricsSnapshot.trackedPurchases)
      : 0,
    effectiveUsdPer100Gd: commerceSummaryMetrics.deliveredGumDrops > 0
      ? roundCurrency(userMetricsSnapshot.totalRevenueUsd / (commerceSummaryMetrics.deliveredGumDrops / 100))
      : 0,
    payingUsers: userMetricsSnapshot.payingUsers,
    commerceTruthLabel: commerceSummaryMetrics.commerceTruthLabel,
    commerceSourceLabel: commerceSummaryMetrics.commerceSourceLabel,
    commerceEmptyReason: commerceSummaryMetrics.commerceEmptyReason,
    metricsSnapshot: userMetricsSnapshot,
    truthSnapshot: userTruthSnapshot,
  };

  return {
    ...summaryBase,
    kpiCards: buildAdminUsersKpiCards({ summary: summaryBase }),
  };
}

function buildEmptyDailyAggregate(): UserDailyAggregate {
  return {
    eventCount: 0,
    sessionCount: 0,
    viewCount: 0,
    engagedViewCount: 0,
    passiveViewCount: 0,
    bounceCount: 0,
    unwrapCount: 0,
    unlockCount: 0,
    purchaseCount: 0,
    authSuccessCount: 0,
    onboardingStartCount: 0,
    onboardingCompletionCount: 0,
    watchSecondsTotal: 0,
    loadMsTotal: 0,
    loadSampleCount: 0,
    spendGdTotal: 0,
    revenueCentsTotal: 0,
    grossRevenueUsdTotal: 0,
    paypalFeeUsdTotal: 0,
    netRevenueUsdTotal: 0,
    adjustedProfitUsdTotal: 0,
    bonusValueUsdTotal: 0,
    bonusGumDropsTotal: 0,
    deliveredGumDropsTotal: 0,
    paidGumDropsTotal: 0,
    rewardGdEarnedTotal: 0,
    lastSeenAt: 0,
    lastPurchaseAt: 0,
  };
}

export let GET = withRouteRuntimeHealth("admin/users:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/users:PUT", PUT_handler);
export let POST = withRouteRuntimeHealth("admin/users:POST", POST_handler);
