import type {
  UserBehaviorRollup,
  UserBehaviorRollupConfidence,
  UserBehaviorRollupIssue,
  UserBehaviorRollupSource,
} from "@/lib/user-behavior-rollup-contract";

import "server-only";

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveSource(input: {
  hasRollup?: boolean;
  hasDaily?: boolean;
  hasFacts?: boolean;
  hasSessionFacts?: boolean;
  hasWatchSessions?: boolean;
  hasLegacyPageDuration?: boolean;
  hasTransactions?: boolean;
}): UserBehaviorRollupSource {
  const sourceCount = [
    input.hasRollup,
    input.hasDaily,
    input.hasFacts,
    input.hasSessionFacts,
    input.hasWatchSessions,
    input.hasLegacyPageDuration,
    input.hasTransactions,
  ].filter(Boolean).length;

  if (sourceCount > 1) return "mixed";
  if (input.hasRollup) return "analytics_users_rollup";
  if (input.hasDaily) return "analytics_user_daily";
  if (input.hasFacts) return "analytics_event_facts";
  if (input.hasSessionFacts) return "analytics_viewer_session_facts";
  if (input.hasWatchSessions) return "watch_session_rollup";
  if (input.hasLegacyPageDuration) return "legacy_page_duration";
  if (input.hasTransactions) return "transactions";
  return "unavailable";
}

function resolveConfidence(input: {
  source: UserBehaviorRollupSource;
  issueCount: number;
}): UserBehaviorRollupConfidence {
  if (input.source === "unavailable") return "unknown";
  if (input.source === "legacy_page_duration") return "low";
  if (input.issueCount > 1) return "low";
  if (input.issueCount === 1) return "medium";
  if (input.source === "mixed" || input.source === "analytics_users_rollup") return "high";
  return "medium";
}

export function buildUserBehaviorRollup(input: {
  userId: string;
  totalActions?: unknown;
  views?: unknown;
  unwraps?: unknown;
  watchTimeMs?: unknown;
  watchSecondsTotal?: unknown;
  purchasesCount?: unknown;
  revenueUsd?: unknown;
  paidGdPurchased?: unknown;
  rewardGdEarned?: unknown;
  onboardingCompleted?: boolean;
  authEvents?: unknown;
  pushEnabled?: boolean;
  lastSeenAt?: unknown;
  hasRollup?: boolean;
  hasDaily?: boolean;
  hasFacts?: boolean;
  hasSessionFacts?: boolean;
  hasWatchSessions?: boolean;
  hasLegacyPageDuration?: boolean;
  hasTransactions?: boolean;
  commerceSourcePresent?: boolean;
  sourceIssues?: Array<string | { code?: string; message: string; severity?: "info" | "warn" | "fail"; evidence?: Record<string, unknown> }>;
}): UserBehaviorRollup {
  const views = Math.max(0, Math.round(readNumber(input.views)));
  const watchTimeMs = Math.max(
    0,
    Math.round(readNumber(input.watchTimeMs) || readNumber(input.watchSecondsTotal) * 1000),
  );
  const authEvents = Math.max(0, Math.round(readNumber(input.authEvents)));
  const source = resolveSource(input);
  const issues: UserBehaviorRollupIssue[] = [];

  if (source === "unavailable") {
    issues.push({
      code: "missing_behavior_sources",
      severity: "fail",
      message: "No canonical behavior rollup source is available for this user.",
      evidence: {
        hasRollup: input.hasRollup === true,
        hasDaily: input.hasDaily === true,
        hasFacts: input.hasFacts === true,
        hasSessionFacts: input.hasSessionFacts === true,
        hasWatchSessions: input.hasWatchSessions === true,
        hasLegacyPageDuration: input.hasLegacyPageDuration === true,
        hasTransactions: input.hasTransactions === true,
      },
    });
  }

  if (views > 0 && watchTimeMs === 0) {
    issues.push({
      code: "watch_time_missing_despite_views",
      severity: "warn",
      message: "Views exist but valid watch-session rollups are missing.",
      evidence: { views, watchTimeMs },
    });
  }

  if (input.onboardingCompleted === true && authEvents === 0) {
    issues.push({
      code: "missing_auth_stats_for_onboarded_user",
      severity: "warn",
      message: "User is onboarded but auth events are missing from the behavior rollup.",
      evidence: { onboardingCompleted: true, authEvents },
    });
  }

  if (readNumber(input.revenueUsd) > 0 && input.commerceSourcePresent === false) {
    issues.push({
      code: "commerce_source_missing",
      severity: "warn",
      message: "Revenue is present but commerce source metadata is missing.",
      evidence: { revenueUsd: readNumber(input.revenueUsd), commerceSourcePresent: false },
    });
  }

  if ((views > 0 || readNumber(input.totalActions) > 0) && readNumber(input.lastSeenAt) === 0) {
    issues.push({
      code: "last_seen_missing",
      severity: "warn",
      message: "Behavior exists but last seen timestamp is missing.",
      evidence: { views, totalActions: readNumber(input.totalActions), lastSeenAt: readNumber(input.lastSeenAt) },
    });
  }

  (input.sourceIssues ?? []).forEach((issue) => {
    if (!issue) return;
    if (typeof issue !== "string") {
      issues.push({
        code: issue.code === "watch_time_missing_despite_views" || issue.code === "legacy_page_duration_fallback"
          ? issue.code
          : "source_degraded",
        severity: issue.severity ?? "info",
        message: issue.message,
        evidence: issue.evidence ?? {},
      });
      return;
    }

    issues.push({
      code: "source_degraded",
      severity: "info",
      message: issue,
      evidence: { sourceIssue: issue },
    });
  });

  return {
    userId: input.userId,
    totalActions: Math.max(0, Math.round(readNumber(input.totalActions))),
    views,
    unwraps: Math.max(0, Math.round(readNumber(input.unwraps))),
    watchTimeMs,
    purchasesCount: Math.max(0, Math.round(readNumber(input.purchasesCount))),
    revenueUsd: Math.max(0, readNumber(input.revenueUsd)),
    paidGdPurchased: Math.max(0, Math.round(readNumber(input.paidGdPurchased))),
    rewardGdEarned: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
    onboardingCompleted: input.onboardingCompleted === true,
    authEvents,
    pushEnabled: input.pushEnabled === true,
    lastSeenAt: Math.max(0, readNumber(input.lastSeenAt)),
    confidence: resolveConfidence({ source, issueCount: issues.length }),
    source,
    issues,
  };
}
