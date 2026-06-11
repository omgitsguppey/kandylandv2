export type AdminBrowserSurfaceDeviceBand = "mobile" | "desktop";

export type AdminBrowserSurfaceDefinition = {
  surfaceId: string;
  route: string;
  browserSmokePath: string;
  title: string;
  group: "overview" | "analytics" | "ops" | "content" | "people" | "protected_money";
  deviceBands: AdminBrowserSurfaceDeviceBand[];
  requiresAdminAuth: true;
  protectedDomain?: "gumdrop_treasury";
  authenticatedVisibleMarkers: readonly string[];
  authenticatedSelectors: readonly string[];
  browserSmokeReason: string;
};

export const ADMIN_BROWSER_SURFACE_DEFINITIONS = [
  {
    surfaceId: "admin_overview",
    route: "/admin",
    browserSmokePath: "/admin",
    title: "Admin Overview",
    group: "overview",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Admin Overview", "data-admin-platform-pulse-grid"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_overview"]'],
    browserSmokeReason: "Main admin landing page and shell navigation must render without hiding source-state labels.",
  },
  {
    surfaceId: "admin_analytics",
    route: "/admin/analytics",
    browserSmokePath: "/admin/analytics",
    title: "Admin Analytics",
    group: "analytics",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Analytics Overview", "data-admin-mobile-surface=analytics", "data-admin-analytics-summary=primary"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_analytics"]'],
    browserSmokeReason: "Analytics panels are dense and must keep snapshot/cache states visible.",
  },
  {
    surfaceId: "admin_drops",
    route: "/admin/drops",
    browserSmokePath: "/admin/drops",
    title: "Admin Drops",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Manage Drops", "Admin Drops"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_drops"]'],
    browserSmokeReason: "Drop moderation and approval controls need admin-only browser confirmation.",
  },
  {
    surfaceId: "admin_users",
    route: "/admin/users",
    browserSmokePath: "/admin/users",
    title: "Admin Users",
    group: "people",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["User Management", "data-admin-users-snapshot-state", "data-admin-users-stats-layout=compact-grid"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_users"]'],
    browserSmokeReason: "User metrics must not collapse missing data into healthy zero states.",
  },
  {
    surfaceId: "admin_user_detail",
    route: "/admin/user/[userId]",
    browserSmokePath: "/admin/user/browser-smoke-user",
    title: "Admin User Detail",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Engagement verdict", "Recommendation verdict", "Value verdict"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_user_detail"]'],
    browserSmokeReason: "User detail drilldown is identity and support sensitive and requires authenticated browser review.",
  },
  {
    surfaceId: "admin_roster",
    route: "/admin/roster",
    browserSmokePath: "/admin/roster",
    title: "Admin Roster",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Creator Review", "data-roster-mode=decision_queue"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_roster"]'],
    browserSmokeReason: "Creator roster decisions need explicit review/waiting/approved states.",
  },
  {
    surfaceId: "admin_debug",
    route: "/admin/debug",
    browserSmokePath: "/admin/debug",
    title: "Admin Debug",
    group: "ops",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Debug Console", "data-admin-mobile-surface=debug", "data-admin-debug-sprawl-reduction=target-75-95"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_debug"]'],
    browserSmokeReason: "Control Tower must show stale/missing/fallback evidence without raw dumps first.",
  },
  {
    surfaceId: "admin_ai",
    route: "/admin/ai",
    browserSmokePath: "/admin/ai",
    title: "Admin AI",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Cover Ops", "Cover Ops Verification"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_ai"]'],
    browserSmokeReason: "AI tooling must show enablement, budget, model, and fallback states safely.",
  },
  {
    surfaceId: "admin_support",
    route: "/admin/support",
    browserSmokePath: "/admin/support",
    title: "Admin Support",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Support Workspace", "Admin Console"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_support"]'],
    browserSmokeReason: "Support inbox states must distinguish missing thread, permission denial, retryable failure, submitted, and received.",
  },
  {
    surfaceId: "admin_moderation",
    route: "/admin/moderation",
    browserSmokePath: "/admin/moderation",
    title: "Admin Moderation",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Moderation Control Tower", "data-admin-moderation-v2=real-risk-workspace"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_moderation"]'],
    browserSmokeReason: "Moderation must avoid treating weak browser heuristics as confirmed server proof.",
  },
  {
    surfaceId: "admin_content",
    route: "/admin/content",
    browserSmokePath: "/admin/content",
    title: "Admin Content",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Content Manager", "Admin Storage"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_content"]'],
    browserSmokeReason: "Content management affordances must be hidden, disabled, or unavailable when not implemented.",
  },
  {
    surfaceId: "admin_queue",
    route: "/admin/queue",
    browserSmokePath: "/admin/queue",
    title: "Admin Queue",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Manage Queue", "Admin Queue"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_queue"]'],
    browserSmokeReason: "Queue states must expose pending/review/source-missing truth.",
  },
  {
    surfaceId: "admin_privacy",
    route: "/admin/privacy",
    browserSmokePath: "/admin/privacy",
    title: "Admin Privacy",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Privacy Console", "Admin Setup"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_privacy"]'],
    browserSmokeReason: "Privacy and consent surfaces must keep source and policy boundaries visible.",
  },
  {
    surfaceId: "admin_economy",
    route: "/admin/economy",
    browserSmokePath: "/admin/economy",
    title: "Admin Economy",
    group: "protected_money",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    protectedDomain: "gumdrop_treasury",
    authenticatedVisibleMarkers: ["GumDrops Commerce Control Center", "Platform Economy"],
    authenticatedSelectors: ['[data-admin-browser-surface="admin_economy"]'],
    browserSmokeReason: "Economy views are protected: browser smoke may inspect labels only and cannot prove GumDrop/payment truth.",
  },
] as const satisfies readonly AdminBrowserSurfaceDefinition[];

export function resolveAdminBrowserSurfaceForPathname(pathname: string | null | undefined) {
  const normalized = pathname?.split("?")[0].replace(/\/$/u, "") || "/admin";
  if (normalized === "/admin") return ADMIN_BROWSER_SURFACE_DEFINITIONS[0];
  if (normalized.startsWith("/admin/user/")) {
    return ADMIN_BROWSER_SURFACE_DEFINITIONS.find((surface) => surface.surfaceId === "admin_user_detail") ?? null;
  }
  return ADMIN_BROWSER_SURFACE_DEFINITIONS.find((surface) => surface.route === normalized) ?? null;
}
