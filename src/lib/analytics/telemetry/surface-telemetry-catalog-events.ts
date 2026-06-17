export const SURFACE_TELEMETRY_CATALOG_EVENT_KINDS = [
  "surface_viewed",
  "surface_loaded",
  "surface_empty_viewed",
  "surface_degraded_viewed",
  "surface_error_viewed",
  "surface_action_attempted",
  "surface_action_succeeded",
  "surface_action_failed",
  "surface_permission_denied",
  "surface_not_configured_viewed",
] as const;

export type SurfaceTelemetryCatalogEventKind = typeof SURFACE_TELEMETRY_CATALOG_EVENT_KINDS[number];

type SurfaceTelemetryCatalogSurface = {
  surfaceId: string;
  label: string;
  featureId: string;
  category: "auth" | "notifications" | "tasks" | "engagement" | "commerce" | "content" | "navigation" | "admin" | "security" | "system";
  modules: ("auth" | "onboarding" | "navigation" | "notifications" | "tasks" | "task_guidance" | "commerce" | "content" | "viewer" | "creator" | "engagement" | "admin" | "security" | "runtime")[];
  aliasesByKind?: Partial<Record<SurfaceTelemetryCatalogEventKind, string[]>>;
};

export type SurfaceTelemetryCatalogEventOption = {
  eventName: string;
  label: string;
  category: SurfaceTelemetryCatalogSurface["category"];
  modules: SurfaceTelemetryCatalogSurface["modules"];
  aliases: string[];
  auditCoveredBy: string[];
};

export type SurfaceTelemetryCatalogEventOverride = {
  eventName: string;
  kind: SurfaceTelemetryCatalogEventKind;
  surfaceId: string;
  featureId: string;
  materializerLane: string;
  debugVisibility: "debug_visible";
  scoreEvidenceImpact: string;
};

const SURFACE_TELEMETRY_CATALOG_SURFACES: SurfaceTelemetryCatalogSurface[] = [
  {
    surfaceId: "public_homepage",
    label: "Public homepage",
    featureId: "drops",
    category: "engagement",
    modules: ["engagement", "navigation", "content"],
    aliasesByKind: {
      surface_viewed: ["home_page_viewed"],
      surface_action_attempted: ["hero_cta_clicked"],
    },
  },
  {
    surfaceId: "auth",
    label: "Signup and login",
    featureId: "auth_identity",
    category: "auth",
    modules: ["auth"],
    aliasesByKind: {
      surface_viewed: ["auth_surface_viewed", "auth_modal_opened"],
      surface_action_attempted: ["auth_attempt_started"],
      surface_action_succeeded: ["auth_attempt_succeeded"],
      surface_action_failed: ["auth_attempt_failed"],
    },
  },
  {
    surfaceId: "user_dashboard",
    label: "User dashboard",
    featureId: "user_dashboard",
    category: "engagement",
    modules: ["engagement", "navigation"],
    aliasesByKind: {
      surface_viewed: ["dashboard_viewed", "page_viewed"],
    },
  },
  {
    surfaceId: "wallet_purchase_modal",
    label: "Wallet purchase modal",
    featureId: "wallet",
    category: "commerce",
    modules: ["commerce"],
    aliasesByKind: {
      surface_viewed: ["wallet_opened"],
      surface_action_attempted: ["purchase_package_selected", "begin_checkout"],
      surface_action_succeeded: ["gumdrops_purchase_completed", "purchase"],
      surface_action_failed: ["gumdrops_purchase_failed"],
    },
  },
  {
    surfaceId: "drops_library",
    label: "Drops library",
    featureId: "library",
    category: "content",
    modules: ["content", "engagement", "viewer"],
    aliasesByKind: {
      surface_viewed: ["library_viewed", "drop_library_viewed"],
      surface_action_attempted: ["drop_clicked"],
      surface_action_succeeded: ["drop_unlocked"],
      surface_action_failed: ["drop_unlock_failed"],
    },
  },
  {
    surfaceId: "creator_dashboard",
    label: "Creator dashboard",
    featureId: "creator_dashboard",
    category: "engagement",
    modules: ["creator", "engagement"],
    aliasesByKind: {
      surface_viewed: ["creator_dashboard_viewed"],
    },
  },
  {
    surfaceId: "creator_settings",
    label: "Creator settings",
    featureId: "creator_settings",
    category: "engagement",
    modules: ["creator", "engagement"],
    aliasesByKind: {
      surface_viewed: ["creator_settings_viewed"],
      surface_action_succeeded: ["creator_settings_saved"],
      surface_action_failed: ["creator_settings_save_failed"],
    },
  },
  {
    surfaceId: "creator_drop_manager",
    label: "Creator drop manager",
    featureId: "creator_drop_manager",
    category: "engagement",
    modules: ["creator", "content"],
    aliasesByKind: {
      surface_viewed: ["creator_drop_manager_opened"],
      surface_action_attempted: ["creator_drop_submission_started"],
      surface_action_failed: ["creator_drop_submit_failed"],
    },
  },
  {
    surfaceId: "creator_profile_timeline",
    label: "Creator profile timeline",
    featureId: "creator_profile",
    category: "engagement",
    modules: ["creator", "engagement", "content"],
    aliasesByKind: {
      surface_viewed: ["creator_profile_viewed", "creator_timeline_viewed", "creator_discovery_surface_viewed", "creator_profile_opened"],
      surface_loaded: ["creator_relationship_list_loaded"],
      surface_empty_viewed: ["creator_recommendation_viewed"],
      surface_action_attempted: ["creator_follow_attempted", "creator_unfollow_attempted", "creator_card_clicked", "creator_recommendation_clicked"],
      surface_action_succeeded: ["creator_followed", "creator_follow_succeeded", "creator_unfollowed", "creator_unfollow_succeeded"],
      surface_action_failed: ["creator_follow_failed", "creator_relationship_list_failed"],
    },
  },
  {
    surfaceId: "chat",
    label: "Chat",
    featureId: "chat_system_internal",
    category: "engagement",
    modules: ["engagement", "runtime"],
    aliasesByKind: {
      surface_viewed: ["chat_surface_viewed"],
      surface_loaded: ["chat_thread_list_loaded"],
      surface_action_succeeded: ["chat_message_sent"],
      surface_action_failed: ["chat_message_failed"],
    },
  },
  {
    surfaceId: "daily_tasks_checkin",
    label: "Daily tasks and check-in",
    featureId: "daily_checkin",
    category: "tasks",
    modules: ["tasks", "task_guidance", "engagement"],
    aliasesByKind: {
      surface_viewed: ["daily_checkin_viewed", "daily_task_panel_viewed"],
      surface_action_succeeded: ["daily_checkin_claimed", "daily_task_completed"],
      surface_action_failed: ["daily_checkin_failed", "daily_task_failed"],
    },
  },
  {
    surfaceId: "notifications_pwa_prompt",
    label: "Notifications and PWA prompt",
    featureId: "notifications",
    category: "notifications",
    modules: ["notifications"],
    aliasesByKind: {
      surface_viewed: ["notification_prompt_viewed"],
      surface_action_attempted: ["notification_permission_requested"],
      surface_action_succeeded: ["notification_permission_granted"],
      surface_action_failed: ["notification_permission_denied"],
      surface_permission_denied: ["notification_permission_denied"],
    },
  },
  {
    surfaceId: "account_settings",
    label: "Account settings",
    featureId: "user_dashboard",
    category: "engagement",
    modules: ["engagement", "auth"],
    aliasesByKind: {
      surface_viewed: ["user_settings_viewed", "settings_surface_viewed"],
      surface_action_succeeded: ["setting_save_succeeded"],
      surface_action_failed: ["setting_save_failed"],
    },
  },
  {
    surfaceId: "admin_dashboard",
    label: "Admin dashboard",
    featureId: "admin_debug",
    category: "admin",
    modules: ["admin", "runtime"],
    aliasesByKind: {
      surface_viewed: ["admin_dashboard_viewed", "admin_overview_viewed"],
      surface_loaded: ["admin_overview_loaded"],
      surface_degraded_viewed: ["admin_overview_degraded"],
    },
  },
  {
    surfaceId: "admin_debug",
    label: "Admin debug",
    featureId: "admin_debug",
    category: "admin",
    modules: ["admin", "runtime"],
    aliasesByKind: {
      surface_viewed: ["admin_debug_viewed"],
      surface_loaded: ["admin_debug_loaded"],
      surface_error_viewed: ["admin_debug_error_viewed"],
    },
  },
  {
    surfaceId: "user_management",
    label: "User management",
    featureId: "admin_debug",
    category: "admin",
    modules: ["admin", "security"],
    aliasesByKind: {
      surface_viewed: ["admin_user_management_viewed"],
      surface_action_attempted: ["admin_user_action_started"],
      surface_action_failed: ["admin_user_action_failed"],
    },
  },
  {
    surfaceId: "support_policies",
    label: "Support and policies",
    featureId: "support",
    category: "engagement",
    modules: ["engagement", "runtime"],
    aliasesByKind: {
      surface_viewed: ["support_inbox_viewed", "support_thread_opened"],
      surface_action_succeeded: ["support_ticket_created", "bug_report_submitted"],
      surface_action_failed: ["support_thread_reply_failed"],
    },
  },
];

function labelForKind(surfaceLabel: string, kind: SurfaceTelemetryCatalogEventKind) {
  return `${surfaceLabel} ${kind.replace(/^surface_/u, "").replace(/_/gu, " ")}`;
}

export const SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS: SurfaceTelemetryCatalogEventOption[] =
  SURFACE_TELEMETRY_CATALOG_SURFACES.flatMap((surface) =>
    SURFACE_TELEMETRY_CATALOG_EVENT_KINDS.map((kind) => ({
      eventName: `${surface.surfaceId}_${kind}`,
      label: labelForKind(surface.label, kind),
      category: surface.category,
      modules: surface.modules,
      aliases: surface.aliasesByKind?.[kind] ?? [],
      auditCoveredBy: ["surface_telemetry_parity"],
    })),
  );

const EXISTING_CATALOG_SURFACE_EVENT_NAMES = new Set([
  "auth_surface_viewed",
  "chat_surface_viewed",
]);

export const SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS_TO_APPEND =
  SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS.filter((event) =>
    !EXISTING_CATALOG_SURFACE_EVENT_NAMES.has(event.eventName),
  );

export const SURFACE_TELEMETRY_CATALOG_EVENT_OVERRIDES: SurfaceTelemetryCatalogEventOverride[] =
  SURFACE_TELEMETRY_CATALOG_SURFACES.flatMap((surface) =>
    SURFACE_TELEMETRY_CATALOG_EVENT_KINDS.map((kind) => ({
      eventName: `${surface.surfaceId}_${kind}`,
      kind,
      surfaceId: surface.surfaceId,
      featureId: surface.featureId,
      materializerLane: `${surface.surfaceId}_surface_telemetry`,
      debugVisibility: "debug_visible" as const,
      scoreEvidenceImpact: "surface_telemetry_parity",
    })),
  );

export const SURFACE_TELEMETRY_CATALOG_EVENT_OVERRIDES_BY_NAME = Object.fromEntries(
  SURFACE_TELEMETRY_CATALOG_EVENT_OVERRIDES.map((event) => [event.eventName, event]),
) as Record<string, SurfaceTelemetryCatalogEventOverride>;

export function getSurfaceTelemetryCatalogEventOverride(eventName: string) {
  return SURFACE_TELEMETRY_CATALOG_EVENT_OVERRIDES_BY_NAME[eventName] ?? null;
}
