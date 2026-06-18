import { formatDistanceToNow } from "date-fns";

import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import {
  resolveAdminTruthState,
  type AdminTruthState,
} from "@/lib/admin-truth-state";
import type { AdminOverviewResponse } from "@/lib/admin-overview";
import type { Transaction } from "@/types/db";
import type {
  AdminOverviewPageData,
  AdminUserDetailPageData,
  AdminUserDetailPageLoaderInput,
  AdminUsersPageData,
  AdminUsersPageLoaderInput,
} from "@/lib/admin/admin-page-data-contract";

function toAdminTruthState(value: string): AdminTruthState | undefined {
  if (
    value === "live" ||
    value === "refreshing" ||
    value === "stale" ||
    value === "degraded" ||
    value === "failed" ||
    value === "unavailable" ||
    value === "delayed" ||
    value === "privacy_limited" ||
    value === "legacy_fallback" ||
    value === "blocked"
  ) {
    return value;
  }
  return undefined;
}

export function buildAdminOverviewPageData(input: {
  data?: AdminOverviewResponse;
  error?: Error;
  isLoading: boolean;
}): AdminOverviewPageData {
  const issueCount = input.data?.overviewIssues?.length ?? input.data?.issues?.length ?? 0;
  const truthSnapshot = input.data?.truthSnapshot ?? null;
  const lastServerConfirmedAt = input.data?.realtimeDebugMeta?.lastServerConfirmedAt;
  const lastTransactionAt = input.data?.freshness.lastTransactionAt;
  const serverUpdateLabel = lastServerConfirmedAt && lastServerConfirmedAt > 0
    ? `Last server update ${formatDistanceToNow(lastServerConfirmedAt, { addSuffix: true })}`
    : lastTransactionAt && lastTransactionAt > 0
      ? `Last server update ${formatDistanceToNow(lastTransactionAt, { addSuffix: true })}`
      : "No server update yet";
  const truthLabel = input.data?.truthNotes?.overview ?? "Collecting activity";
  const fallbackState = input.error ? "failed" : input.isLoading ? "loading" : "unavailable";
  const fallbackMessage = input.error?.message
    ?? (input.isLoading ? "Loading overview snapshot." : "Overview snapshot has no verified source yet.");
  const truthState = resolveAdminTruthState({
    hasUsableValue: Boolean(truthSnapshot || input.data?.platformPulse?.length),
    sourceConfigured: true,
    transportState: input.error ? "failed" : input.isLoading && !input.data ? "loading" : undefined,
    valueState: truthSnapshot?.sourceFreshness,
    reviewRequired: issueCount > 0,
  });

  return {
    truthSnapshot,
    truthLabel,
    truthState,
    issueCount,
    serverUpdateLabel,
    fallbackState,
    fallbackMessage,
    platformPulse: input.data?.platformPulse,
  };
}

export function buildAdminUsersPageData(input: AdminUsersPageLoaderInput): AdminUsersPageData {
  const truthSnapshot = input.summary?.truthSnapshot ?? null;
  const truthState = resolveAdminTruthState({
    hasUsableValue: Boolean(input.summary?.kpiCards?.length),
    sourceConfigured: true,
    transportState: !input.summary && input.summaryLoading ? "loading" : input.snapshotRefreshState,
    valueState: truthSnapshot?.sourceFreshness,
    reviewRequired: Boolean(truthSnapshot?.issues.length),
  });
  const realtimePulseTruthState = resolveAdminTruthState({
    hasUsableValue: Boolean(input.summary),
    sourceConfigured: true,
    transportState: input.usersRealtimePulse.pulseState,
    refreshInFlight: input.usersRealtimePulse.pulseState === "loading" || input.usersRealtimePulse.pulseState === "fallback",
    valueState: truthSnapshot?.sourceFreshness,
    reviewRequired: false,
  });
  const subtitle = truthSnapshot?.generatedAt
    ? `Canonical snapshot ${formatDistanceToNow(new Date(truthSnapshot.generatedAt), { addSuffix: true })}`
    : "Manage accounts, roles, balance, and content access.";

  return {
    truthSnapshot,
    truthState,
    realtimePulseTruthState,
    subtitle,
    kpiCards: input.summary?.kpiCards ?? [],
    behaviorLeaderboard: input.behaviorLeaderboard,
  };
}

function buildPurchaseTransactions(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.status === "completed" && (transaction.type === "purchase_currency" || String(transaction.type) === "purchase"))
    .map((transaction) => ({
      ...transaction,
      economics: deriveGumdropEconomics(
        transaction.deliveredGumDrops ?? transaction.amount,
        transaction.grossRevenueUsd ?? transaction.cost ?? 0,
      ),
    }));
}

export function buildAdminUserDetailPageData(input: AdminUserDetailPageLoaderInput): AdminUserDetailPageData {
  const purchaseTransactions = buildPurchaseTransactions(input.transactions);
  const analytics = input.analytics;
  const txTotals = purchaseTransactions.reduce((acc, transaction) => ({
    grossRevenueUsd: acc.grossRevenueUsd + transaction.economics.grossRevenueUsd,
    adjustedProfitUsd: acc.adjustedProfitUsd + transaction.economics.adjustedProfitUsd,
    bonusValueUsd: acc.bonusValueUsd + transaction.economics.bonusValueUsd,
    bonusGumDrops: acc.bonusGumDrops + transaction.economics.bonusGumDrops,
    paypalFeeUsd: acc.paypalFeeUsd + transaction.economics.paypalFeeUsd,
    netRevenueUsd: acc.netRevenueUsd + transaction.economics.netRevenueUsd,
    deliveredGumDrops: acc.deliveredGumDrops + transaction.economics.deliveredGumDrops,
  }), {
    grossRevenueUsd: 0,
    adjustedProfitUsd: 0,
    bonusValueUsd: 0,
    bonusGumDrops: 0,
    paypalFeeUsd: 0,
    netRevenueUsd: 0,
    deliveredGumDrops: 0,
  });

  const totalSpentUsd = analytics?.grossRevenueUsd ?? txTotals.grossRevenueUsd;
  const adjustedProfitUsd = analytics?.adjustedProfitUsd ?? txTotals.adjustedProfitUsd;
  const bonusValueUsd = analytics?.bonusValueUsd ?? txTotals.bonusValueUsd;
  const bonusGumDrops = analytics?.bonusGumDrops ?? txTotals.bonusGumDrops;
  const paypalFeeUsd = analytics?.paypalFeeUsd ?? txTotals.paypalFeeUsd;
  const netRevenueUsd = analytics?.netRevenueUsd ?? txTotals.netRevenueUsd;
  const deliveredGumDrops = analytics?.deliveredGumDrops ?? txTotals.deliveredGumDrops;
  const purchaseCount = analytics?.purchaseCount || purchaseTransactions.length;
  const effectiveUsdPer100Gd = analytics?.effectiveUsdPer100Gd ?? (deliveredGumDrops > 0 ? totalSpentUsd / (deliveredGumDrops / 100) : 0);
  const averageOrderUsd = purchaseCount > 0 ? totalSpentUsd / purchaseCount : 0;
  const failedTxCount = input.transactions.filter((transaction) => transaction.status === "failed").length;
  const behaviorRollup = analytics?.behaviorRollup;

  return {
    commerce: {
      totalSpentUsd,
      adjustedProfitUsd,
      bonusValueUsd,
      bonusGumDrops,
      paypalFeeUsd,
      netRevenueUsd,
      deliveredGumDrops,
      effectiveUsdPer100Gd,
      averageOrderUsd,
      failedTxCount,
    },
    behavior: {
      behaviorRollup,
      behaviorTruthRollup: analytics?.behaviorTruthRollup,
      engagement: analytics?.engagement ?? behaviorRollup?.engagement,
      value: analytics?.value ?? behaviorRollup?.value,
      actionLedger: analytics?.actionLedger ?? [],
      issueSummary: behaviorRollup?.issues.map((issue) => issue.message).join(" ") ?? "",
    },
  };
}
