export type AdminAnalyticsPathClassification =
  | "canonical"
  | "adapter"
  | "legacy_fallback"
  | "deprecated"
  | "blocked";

export type AdminAnalyticsLegacyItem = {
  file: string;
  finding: string;
  classification: AdminAnalyticsPathClassification;
  canonicalReplacement: string;
  removeBy: string;
  allowedImports: string[];
  blockedConsumers: string[];
};

export const ADMIN_ANALYTICS_LEGACY_REGISTRY: AdminAnalyticsLegacyItem[] = [
  {
    file: "src/lib/server/admin-user-truth-snapshot.ts",
    finding: "Canonical admin snapshot wrapper",
    classification: "canonical",
    canonicalReplacement: "src/lib/server/admin-user-truth-snapshot.ts",
    removeBy: "n/a",
    allowedImports: [
      "src/app/api/admin/overview/route.ts",
      "src/app/api/admin/users/route.ts",
      "src/app/api/admin/debug/route.ts",
    ],
    blockedConsumers: [],
  },
  {
    file: "src/lib/server/user-behavior-truth-rollup.ts",
    finding: "Canonical per-user truth rollup wrapper",
    classification: "canonical",
    canonicalReplacement: "src/lib/server/user-behavior-truth-rollup.ts",
    removeBy: "n/a",
    allowedImports: [
      "src/app/api/admin/user/[userId]/route.ts",
      "src/app/admin/user/[userId]/page.tsx",
    ],
    blockedConsumers: [],
  },
  {
    file: "src/lib/admin-overview.ts",
    finding: "Old overview display contract kept only as adapter shell while snapshot migration lands",
    classification: "adapter",
    canonicalReplacement: "src/lib/server/admin-user-truth-snapshot.ts",
    removeBy: "2026-06-15",
    allowedImports: [
      "src/app/api/admin/overview/route.ts",
      "src/components/Admin/AdminStatsBar.tsx",
    ],
    blockedConsumers: [
      "src/app/admin/users/page.tsx",
      "src/app/admin/user/[userId]/page.tsx",
    ],
  },
  {
    file: "src/lib/admin-analytics-live-runtime.ts",
    finding: "Direct admin analytics live formulas",
    classification: "blocked",
    canonicalReplacement: "src/lib/server/admin-user-truth-snapshot.ts",
    removeBy: "2026-05-31",
    allowedImports: [],
    blockedConsumers: [
      "src/app/admin/users/page.tsx",
      "src/app/admin/user/[userId]/page.tsx",
      "src/app/admin/page.tsx",
    ],
  },
  {
    file: "src/lib/server/analytics-metrics.ts",
    finding: "Raw event-name rollup formulas remain legacy analytics support only",
    classification: "legacy_fallback",
    canonicalReplacement: "src/lib/server/metric-fact-materializer.ts",
    removeBy: "2026-06-30",
    allowedImports: [
      "src/app/api/admin/analytics/**",
    ],
    blockedConsumers: [
      "src/app/admin/users/page.tsx",
      "src/app/admin/user/[userId]/page.tsx",
      "src/app/api/admin/users/route.ts",
      "src/app/api/admin/user/[userId]/route.ts",
    ],
  },
  {
    file: "scripts/release/update-public-changelog.ts",
    finding: "Canonical beta odometer release-note generator",
    classification: "canonical",
    canonicalReplacement: "scripts/release/update-public-changelog.ts",
    removeBy: "n/a",
    allowedImports: [],
    blockedConsumers: [],
  },
];

