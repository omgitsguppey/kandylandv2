export type LegacyRegistryStatus =
  | "allowed_fallback"
  | "deprecated"
  | "blocked"
  | "remove_by_deadline"
  | "canonical";

export type LegacyPhaseOutStage =
  | "documented"
  | "guarded"
  | "redirected"
  | "unused"
  | "removed";

export type LegacyRegistryItem = {
  id: string;
  name: string;
  paths: string[];
  status: LegacyRegistryStatus;
  canonicalReplacement: string;
  phaseOutStage: LegacyPhaseOutStage;
  ownerSurface: string;
  createdAt: string;
  reviewBy: string;
  removeBy: string;
  riskIfKept: string;
  allowedReferences: string[];
  blockedReferences: string[];
};

export const LEGACY_PHASEOUT_REPORT_PATH = "agent/state/legacy-phaseout.generated.json";
export const LEGACY_PHASEOUT_DOC_PATH = "docs/agent-truth/legacy-phaseout.md";

export const LEGACY_STAGE_PENALTY: Record<LegacyPhaseOutStage, number> = {
  documented: 5,
  guarded: 3,
  redirected: 2,
  unused: 1,
  removed: 0,
};

export const LEGACY_REGISTRY: LegacyRegistryItem[] = [
  {
    id: "drop-preview-modal-fallback",
    name: "DropPreviewModal legacy fallback",
    paths: ["src/components/DropPreviewModal.tsx"],
    status: "allowed_fallback",
    canonicalReplacement: "Full-page locked Drop preview route at /drops/[id]/preview",
    phaseOutStage: "guarded",
    ownerSurface: "locked_drop_preview",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-19",
    removeBy: "2026-07-01",
    riskIfKept: "Locked preview ownership can drift back to modal-first behavior and weaken content-protection/conversion truth.",
    allowedReferences: [
      "src/components/DropPreviewModal.tsx",
      "src/lib/agent-score/public-beta-scanner.ts",
      "src/lib/device-layout-score.ts",
      "src/lib/device-ui-dry-audit.ts",
      "scripts/agent/score-orphaned-logic.ts",
      "docs/agent-truth/orphaned-logic-score.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "import { DropPreviewModal }",
      "<DropPreviewModal",
      "from \"@/components/DropPreviewModal\"",
      "from '@/components/DropPreviewModal'",
    ],
  },
  {
    id: "drops-query-modal-flow",
    name: "/drops?drop modal query flow",
    paths: ["src/app/drops/DropsClient.tsx"],
    status: "remove_by_deadline",
    canonicalReplacement: "Redirect or hand off to /drops/[id]/preview only",
    phaseOutStage: "redirected",
    ownerSurface: "drops_discovery_to_preview",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-19",
    removeBy: "2026-06-15",
    riskIfKept: "Deep links can silently restore modal-first locked preview ownership instead of the canonical full-page route.",
    allowedReferences: [
      "src/app/drops/DropsClient.tsx",
      "scripts/agent/score-orphaned-logic.ts",
      "docs/agent-truth/orphaned-logic-score.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "\"/drops?drop=",
      "'/drops?drop=",
      "`/drops?drop=",
      "setSelectedDrop(",
    ],
  },
  {
    id: "synthetic-view-as-local-projection",
    name: "Synthetic/simulative admin view-as",
    paths: [
      "src/lib/admin/synthetic-creators-view-as.ts",
      "src/context/AdminViewAsContext.tsx",
      "src/app/api/admin/view-as-creator/route.ts",
    ],
    status: "deprecated",
    canonicalReplacement: "Admin creator projection with actorAdminId, performedAs, local-only source truth, and write-block diagnostics",
    phaseOutStage: "guarded",
    ownerSurface: "admin_creator_projection",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-26",
    removeBy: "2026-07-15",
    riskIfKept: "Local projection and synthetic creator state can be mistaken for live creator behavior or user engagement.",
    allowedReferences: [
      "src/lib/admin/synthetic-creators-view-as.ts",
      "src/context/AdminViewAsContext.tsx",
      "src/app/api/admin/view-as-creator/route.ts",
      "src/app/admin/roster/decision-queue.ts",
      "src/lib/analytics/analytics-event-contract.ts",
      "src/lib/behavioral/normalize-event-fact.ts",
      "src/lib/behavioral/event-fact-normalizer.ts",
      "src/lib/identity-truth/identity/actor-markers.ts",
      "src/lib/server/analytics.ts",
      "scripts/agent/validate-synthetic-creators-view-as.ts",
      "scripts/agent/validate-admin-projection-analytics-exclusion.ts",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "sourceTruth: \"live_projection\"",
      "includeInUserBehavior: true",
      "performedAs: \"creator\"",
    ],
  },
  {
    id: "old-moderation-screenshot-certainty",
    name: "Old moderation screenshot certainty",
    paths: [
      "src/components/Admin/AdminModerationConsole.tsx",
      "src/components/Admin/AdminModerationSecurityAlerts.tsx",
      "src/lib/moderation/scrape-risk-score.ts",
    ],
    status: "blocked",
    canonicalReplacement: "Evidence-weighted theft-risk and scrape-risk scoring",
    phaseOutStage: "guarded",
    ownerSurface: "admin_moderation_real_risk",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-12",
    removeBy: "2026-06-05",
    riskIfKept: "Weak browser visibility or blur heuristics could be presented as confirmed screenshot evidence.",
    allowedReferences: [
      "scripts/agent/validate-admin-moderation-real-risk.ts",
      "docs/agent-truth/admin-moderation-real-risk.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "Screenshot detected",
      "screenshot detected",
      "screenshotConfirmed",
      "confirmedScreenshot",
      "isScreenshotConfirmed",
      "screenshot certainty",
    ],
  },
  {
    id: "admin-users-realtime-route",
    name: "Realtime-ish admin/users route",
    paths: [
      "src/app/api/admin/users/realtime/route.ts",
    ],
    status: "remove_by_deadline",
    canonicalReplacement: "Admin user hot-cache/materialized snapshot route",
    phaseOutStage: "guarded",
    ownerSurface: "admin_user_hot_cache",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-26",
    removeBy: "2026-08-01",
    riskIfKept: "Unbounded realtime admin reads can bypass hot-cache doctrine and inflate cost or stale-state confusion.",
    allowedReferences: [
      "src/app/api/admin/users/realtime/route.ts",
      "scripts/agent/validate-admin-analytics-hot-cache.ts",
      "scripts/agent/validate-admin-analytics-no-pure-realtime.ts",
      "docs/agent-truth/admin-analytics-hot-cache.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "adminDb.collection(\"users\").onSnapshot",
      "adminDb.collection('users').onSnapshot",
      "pure realtime admin users",
    ],
  },
  {
    id: "old-wallet-total-only-balance-chip",
    name: "Old wallet total-only balance chip",
    paths: ["src/components/PurchaseModal.tsx"],
    status: "blocked",
    canonicalReplacement: "Source-aware split balance chip showing free GD and paid GD",
    phaseOutStage: "guarded",
    ownerSurface: "wallet_density",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-12",
    removeBy: "2026-06-05",
    riskIfKept: "Total-only wallet display can hide paid-vs-reward source truth and confuse creator monetization eligibility.",
    allowedReferences: [
      "scripts/agent/validate-wallet-density.ts",
      "docs/agent-truth/wallet-density.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "data-wallet-balance-chip=\"total-only\"",
      "data-wallet-balance-chip='total-only'",
      "total-only balance chip",
      "80,962 balance",
    ],
  },
  {
    id: "old-green-bonus-chips",
    name: "Old green wallet bonus chips",
    paths: ["src/components/PurchaseModal.tsx"],
    status: "blocked",
    canonicalReplacement: "Brand-purple bonus chip theme",
    phaseOutStage: "guarded",
    ownerSurface: "wallet_density",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-12",
    removeBy: "2026-06-05",
    riskIfKept: "Old green bonus chips reintroduce pre-density visual language and can drift from wallet doctrine.",
    allowedReferences: [
      "scripts/agent/validate-wallet-density.ts",
      "docs/agent-truth/wallet-density.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "data-wallet-bonus-chip-theme=\"green\"",
      "data-wallet-bonus-chip-theme='green'",
      "wallet-bonus-chip-theme=\"green\"",
      "green bonus chip",
    ],
  },
  {
    id: "notification-opened-read-score-split",
    name: "Notification opened/read split for behavioral scoring",
    paths: [
      "src/components/Navigation/NotificationBell.tsx",
      "src/components/Notifications/NotificationRuntimeBridge.tsx",
      "src/hooks/useNotifications.ts",
      "src/lib/behavioral/event-fact-normalizer.ts",
      "src/lib/tasks/task-catalog.ts",
    ],
    status: "blocked",
    canonicalReplacement: "Canonical behavioral action notification_read; opened/clicked remain UI diagnostics only",
    phaseOutStage: "guarded",
    ownerSurface: "notification_behavior_truth",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-12",
    removeBy: "2026-06-05",
    riskIfKept: "Notification open and read can be scored separately, inflating engagement counts.",
    allowedReferences: [
      "src/components/Navigation/NotificationBell.tsx",
      "src/components/Notifications/NotificationRuntimeBridge.tsx",
      "src/hooks/useNotifications.ts",
      "src/lib/telemetry-catalog.ts",
      "src/lib/behavioral/event-fact-contract.ts",
      "src/lib/behavioral/event-fact-normalizer.ts",
      "src/lib/behavioral/normalize-event-fact.ts",
      "src/lib/tasks/task-catalog.ts",
      "scripts/agent/validate-notification-read-truth.ts",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "notification_opened_score",
      "scoreNotificationOpened",
      "behavioralScore.notification_opened",
      "engagement.notification_opened",
      "includeNotificationOpenedInBehavior: true",
    ],
  },
  {
    id: "admin-support-realtime-queue",
    name: "Admin support realtime queue",
    paths: [
      "src/components/Admin/AdminSupportQueue.tsx",
      "src/hooks/useAdminSupportRealtime.ts",
    ],
    status: "allowed_fallback",
    canonicalReplacement: "Unified support inbox model with admin support route truth and debug evidence",
    phaseOutStage: "guarded",
    ownerSurface: "support_recovery_flows",
    createdAt: "2026-05-05",
    reviewBy: "2026-05-26",
    removeBy: "2026-08-01",
    riskIfKept: "Admin support UI can keep relying on direct realtime assumptions instead of explicit route truth and debug evidence.",
    allowedReferences: [
      "src/components/Admin/AdminSupportQueue.tsx",
      "src/hooks/useAdminSupportRealtime.ts",
      "scripts/agent/validate-support-recovery-flows.ts",
      "scripts/agent/validate-support-tracking-truth.ts",
      "docs/agent-truth/support-recovery-flows.md",
      "docs/agent-truth/legacy-phaseout.md",
    ],
    blockedReferences: [
      "flat support_messages collection",
      "admin support dashboard reads Firestore directly",
      "support route returns only flat messages",
    ],
  },
];

export function getLegacyRegistry() {
  return LEGACY_REGISTRY;
}

export function getLegacyRegistryItem(id: string) {
  return LEGACY_REGISTRY.find((item) => item.id === id);
}

export function getLegacyRiskWeight(item: LegacyRegistryItem) {
  if (item.status === "canonical") return 0;
  if (item.status === "blocked") return 5;
  if (item.status === "remove_by_deadline") return 4;
  if (item.status === "deprecated") return 3;
  return 2;
}

export function getLegacyOverdueMultiplier(item: LegacyRegistryItem, now = new Date()) {
  const reviewBy = Date.parse(`${item.reviewBy}T00:00:00.000Z`);
  const removeBy = Date.parse(`${item.removeBy}T00:00:00.000Z`);
  const current = now.getTime();
  if (Number.isFinite(removeBy) && current > removeBy) return 3;
  if (Number.isFinite(reviewBy) && current > reviewBy) return 1.5;
  return 1;
}

export function calculateLegacyDebtScore(items: readonly LegacyRegistryItem[], now = new Date()) {
  return Number(items.reduce((total, item) => {
    const stagePenalty = LEGACY_STAGE_PENALTY[item.phaseOutStage];
    const riskWeight = getLegacyRiskWeight(item);
    const overdueMultiplier = getLegacyOverdueMultiplier(item, now);
    return total + stagePenalty * riskWeight * overdueMultiplier;
  }, 0).toFixed(2));
}

export function isAllowedLegacyReference(item: LegacyRegistryItem, filePath: string) {
  return item.allowedReferences.some((allowedPath) => filePath === allowedPath || filePath.startsWith(`${allowedPath}/`));
}
