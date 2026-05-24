export type AdminAnalyticsTabStateSplitStatus =
  | "planned"
  | "next_metric_source_change"
  | "manual_split_required";

export type AdminAnalyticsTabStateSplitPlan = {
  tabId: string;
  owner: string;
  status: AdminAnalyticsTabStateSplitStatus;
  futureHookName: string;
  preserveTruth: string;
  nextAction: string;
};

export const ADMIN_ANALYTICS_TAB_STATE_SPLIT_PLAN: AdminAnalyticsTabStateSplitPlan[] = [
  {
    tabId: "overview",
    owner: "admin-analytics",
    status: "next_metric_source_change",
    futureHookName: "useAdminAnalyticsOverviewState",
    preserveTruth: "freshness, cache, and missing-source labels must remain explicit.",
    nextAction: "Move overview fetch and freshness derivation into a tab hook the next time its metric source changes.",
  },
  {
    tabId: "behavior",
    owner: "admin-analytics",
    status: "next_metric_source_change",
    futureHookName: "useAdminAnalyticsBehaviorState",
    preserveTruth: "watch-time and behavior metrics cannot promote source-ready evidence gaps to live truth.",
    nextAction: "Split behavior/watch consumers after persisted runtime watch evidence is available.",
  },
  {
    tabId: "commerce",
    owner: "admin-analytics",
    status: "planned",
    futureHookName: "useAdminAnalyticsCommerceState",
    preserveTruth: "server purchase and ledger truth remain canonical for revenue and GumDrop accounting.",
    nextAction: "Keep commerce state split separate from wallet/payment runtime behavior.",
  },
];

export const ADMIN_ANALYTICS_TAB_STATE_CONTRACT = {
  sourceFile: "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
  status: "manual_split_required",
  rule: "Do not broaden the admin analytics monolith while refreshing debug artifacts; split tab state in bounded owner-scoped passes.",
  splitPlan: ADMIN_ANALYTICS_TAB_STATE_SPLIT_PLAN,
} as const;
