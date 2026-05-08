import type { AdminOverviewResponse } from "@/lib/admin-overview";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import type { UserBehaviorTruthRollup } from "@/lib/behavioral/user-score-contract";
import type { UserActionLedgerItem } from "@/lib/analytics-action-taxonomy";
import type { UserBehaviorRollup } from "@/lib/user-behavior-rollup-contract";
import type { Transaction } from "@/types/db";
import type {
  AdminBehaviorLeaderboardPanel,
  AdminUsersKpiCard,
  UserAnalytics,
  UsersSummary,
} from "@/types/admin-analytics";

export type AdminOverviewPageData = {
  truthSnapshot: AdminUserTruthSnapshot | null;
  truthLabel: string;
  truthState: AdminTruthState;
  issueCount: number;
  serverUpdateLabel: string;
  fallbackState: "failed" | "loading" | "unavailable";
  fallbackMessage: string;
  platformPulse: AdminOverviewResponse["platformPulse"];
};

export type AdminUsersPageData = {
  truthSnapshot: AdminUserTruthSnapshot | null;
  truthState: AdminTruthState;
  realtimePulseTruthState: AdminTruthState;
  subtitle: string;
  kpiCards: AdminUsersKpiCard[];
  behaviorLeaderboard: AdminBehaviorLeaderboardPanel | null;
};

export type AdminUserDetailAnalyticsInput = {
  grossRevenueUsd?: number;
  adjustedProfitUsd?: number;
  bonusValueUsd?: number;
  bonusGumDrops?: number;
  paypalFeeUsd?: number;
  netRevenueUsd?: number;
  deliveredGumDrops?: number;
  purchaseCount?: number;
  effectiveUsdPer100Gd?: number;
  commerceSourceLabel?: string;
  commerceEmptyReason?: string | null;
  eventCount?: number;
  viewCount?: number;
  authSuccessCount?: number;
  watchSecondsTotal?: number;
  behaviorRollup?: UserBehaviorRollup;
  behaviorTruthRollup?: UserBehaviorTruthRollup;
  engagement?: UserAnalytics["engagement"];
  value?: UserAnalytics["value"];
  actionLedger?: UserActionLedgerItem[];
  parity?: Record<string, unknown>;
};

export type AdminUserDetailPageData = {
  commerce: {
    totalSpentUsd: number;
    adjustedProfitUsd: number;
    bonusValueUsd: number;
    bonusGumDrops: number;
    paypalFeeUsd: number;
    netRevenueUsd: number;
    deliveredGumDrops: number;
    effectiveUsdPer100Gd: number;
    averageOrderUsd: number;
    failedTxCount: number;
  };
  behavior: {
    behaviorRollup?: UserBehaviorRollup;
    behaviorTruthRollup?: UserBehaviorTruthRollup;
    engagement?: UserAnalytics["engagement"];
    value?: UserAnalytics["value"];
    actionLedger: UserActionLedgerItem[];
    issueSummary: string;
  };
};

export type AdminUserDetailPageLoaderInput = {
  analytics: AdminUserDetailAnalyticsInput | null;
  transactions: Transaction[];
};

export type AdminUsersPageLoaderInput = {
  summary: UsersSummary | null;
  summaryLoading: boolean;
  snapshotRefreshState: string;
  usersRealtimePulse: {
    pulseState: string;
  };
  behaviorLeaderboard: AdminBehaviorLeaderboardPanel | null;
};
