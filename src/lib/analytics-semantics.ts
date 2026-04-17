export type AnalyticsSemanticCategory = "global" | "user" | "admin" | "drop";

export interface AnalyticsSemanticContext {
  category: AnalyticsSemanticCategory;
  categoryLabel: string;
  scopeKey: string;
  scopeLabel: string;
  surfaceKey: string;
  surfaceLabel: string;
  pagePath: string;
  dropId?: string;
  dropCategory?: string;
  userRole?: string;
}

export interface AnalyticsSemanticSourceDescriptor {
  key: string;
  label: string;
  engine: "firestore" | "ga4" | "legacy";
  description: string;
}

export interface AnalyticsSemanticStrategy {
  key: string;
  label: string;
  description: string;
}

export const ANALYTICS_SEMANTIC_CATEGORY_LABELS: Record<AnalyticsSemanticCategory, string> = {
  global: "Global",
  user: "User",
  admin: "Admin",
  drop: "KandyDrop",
};

export const ANALYTICS_SEMANTIC_SOURCE_REGISTRY: AnalyticsSemanticSourceDescriptor[] = [
  {
    key: "analytics_event_facts",
    label: "Firestore event facts",
    engine: "firestore",
    description: "Canonical per-event facts for authenticated and server-side telemetry.",
  },
  {
    key: "analytics_session_facts",
    label: "Firestore viewer sessions",
    engine: "firestore",
    description: "Viewer session rollups with watch time, starts, completions, and load samples.",
  },
  {
    key: "analytics_guest_batches",
    label: "Guest interaction batches",
    engine: "firestore",
    description: "Anonymous click, scroll, hover, and page-life-cycle batches captured from the browser.",
  },
  {
    key: "analytics_page_daily",
    label: "Page daily rollups",
    engine: "firestore",
    description: "Daily page aggregates for views, clicks, dwell time, and scroll depth.",
  },
  {
    key: "security_events",
    label: "Security event ledger",
    engine: "firestore",
    description: "Per-user protection alerts and historical flag records.",
  },
  {
    key: "analytics_drop_daily",
    label: "Drop daily rollups",
    engine: "firestore",
    description: "Drop-level daily summaries sourced directly from Firestore rollups.",
  },
  {
    key: "analytics_semantic_daily",
    label: "Semantic daily rollups",
    engine: "firestore",
    description: "Category-aware daily metrics that keep global, user, admin, and drop semantics in one canonical structure.",
  },
  {
    key: "ga4",
    label: "GA4 event stream",
    engine: "ga4",
    description: "External analytics feed used as a comparison source for parity and anomaly detection.",
  },
];

export const ANALYTICS_SEMANTIC_STRATEGIES: AnalyticsSemanticStrategy[] = [
  {
    key: "fact_to_scope_rollup",
    label: "Fact-to-scope rollups",
    description: "Normalize each event into a semantic category and scope, then roll counts and dwell into daily Firestore summaries.",
  },
  {
    key: "guest_auth_session_stitching",
    label: "Guest-to-auth stitching",
    description: "Join anonymous session cookies with authenticated session IDs after sign-in so pre-login browsing still contributes to user journeys.",
  },
  {
    key: "viewer_watch_attribution",
    label: "Viewer watch attribution",
    description: "Blend viewer session facts with drop metadata so watch time lands on the right KandyDrop category even when events arrive late.",
  },
  {
    key: "drop_transaction_correlation",
    label: "Drop transaction correlation",
    description: "Tie unlocks and purchases back to the nearest preview, click, and viewer interactions using deterministic timestamp windows.",
  },
  {
    key: "windowed_bounce_detection",
    label: "Windowed bounce detection",
    description: "Classify passive views and bounces from duration, interaction counts, and scroll depth instead of one-off page-leave events.",
  },
  {
    key: "cross_source_consensus",
    label: "Cross-source consensus scoring",
    description: "Compare Firestore and GA4 counts to compute confidence scores instead of trusting a single stream.",
  },
  {
    key: "late_event_compaction",
    label: "Late-event compaction",
    description: "Re-open recent daily buckets and merge delayed events so historical totals stay accurate without rewriting old functions.",
  },
  {
    key: "security_journey_correlation",
    label: "Security journey correlation",
    description: "Link protection alerts to the active drop, asset, session, and page path so admins can see what happened before and after a flag.",
  },
  {
    key: "adapter_registry_expansion",
    label: "Adapter registry expansion",
    description: "Register new sources and event rules in metadata so future telemetry can join the semantics layer without custom endpoint logic.",
  },
  {
    key: "semantic_metric_registry",
    label: "Semantic metric registry",
    description: "Define platform-style metrics in a shared catalog so product, analytics, and future AI layers read the same formulas and reliability notes.",
  },
];

const LEGACY_PAGE_EVENT_PATHS: Record<string, string> = {
  home_page_viewed: "/",
  privacy_page_viewed: "/privacy",
  terms_page_viewed: "/terms",
    dashboard_viewed: "/dashboard",
    library_viewed: "/dashboard/library",
    profile_settings_viewed: "/dashboard/profile",
    support_inbox_viewed: "/dashboard/support",
    experience_hub_viewed: "/experiences",
  drops_page_viewed: "/drops",
  faq_page_viewed: "/faq",
  admin_dashboard_viewed: "/admin",
    admin_analytics_viewed: "/admin/analytics",
    admin_moderation_viewed: "/admin/moderation",
    admin_debug_viewed: "/admin/debug",
    admin_support_viewed: "/admin/support",
    admin_users_viewed: "/admin/users",
  admin_content_viewed: "/admin/content",
  admin_drops_viewed: "/admin/drops",
  admin_queue_viewed: "/admin/queue",
  admin_roster_viewed: "/admin/roster",
  admin_user_detail_viewed: "/admin/user",
};

export function humanizeAnalyticsKey(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

export function getLegacyPagePathForEvent(eventName: string | null | undefined) {
  if (!eventName) {
    return "";
  }

  return LEGACY_PAGE_EVENT_PATHS[eventName] || "";
}

function normalizePagePath(input: string | null | undefined) {
  if (!input) {
    return "/";
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildScopeDescriptor(pagePath: string, dropId?: string, dropCategory?: string) {
  if (dropId || pagePath.startsWith("/dashboard/viewer")) {
    return {
      category: "drop" as const,
      scopeKey: "drop_viewer",
      scopeLabel: "Drop viewer",
      surfaceKey: dropId ? `drop:${dropId}` : "drop:viewer",
      surfaceLabel: dropId ? `Drop ${dropId}` : "Drop viewer",
    };
  }

  if (pagePath.startsWith("/drops")) {
    return {
      category: "drop" as const,
      scopeKey: "drop_catalog",
      scopeLabel: "Drop catalog",
      surfaceKey: dropCategory ? `drop-category:${dropCategory}` : "drop:catalog",
      surfaceLabel: dropCategory ? `${humanizeAnalyticsKey(dropCategory)} drops` : "Drop catalog",
    };
  }

  if (pagePath.startsWith("/admin/analytics")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_analytics",
      scopeLabel: "Admin analytics",
      surfaceKey: "admin:analytics",
      surfaceLabel: "Admin analytics",
    };
  }

  if (pagePath.startsWith("/admin/users") || pagePath.startsWith("/admin/user")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_users",
      scopeLabel: "Admin roster",
      surfaceKey: "admin:users",
      surfaceLabel: "Admin roster",
    };
  }

  if (pagePath.startsWith("/admin")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_dashboard",
      scopeLabel: "Admin workspace",
      surfaceKey: "admin:workspace",
      surfaceLabel: "Admin workspace",
    };
  }

  if (pagePath.startsWith("/dashboard/library")) {
    return {
      category: "user" as const,
      scopeKey: "user_library",
      scopeLabel: "User library",
      surfaceKey: "user:library",
      surfaceLabel: "User library",
    };
  }

  if (pagePath.startsWith("/dashboard/profile")) {
    return {
      category: "user" as const,
      scopeKey: "user_profile",
      scopeLabel: "Profile settings",
      surfaceKey: "user:profile",
      surfaceLabel: "Profile settings",
    };
  }

  if (pagePath.startsWith("/experiences")) {
    return {
      category: "user" as const,
      scopeKey: "user_experiences",
      scopeLabel: "Experiences hub",
      surfaceKey: "user:experiences",
      surfaceLabel: "Experiences hub",
    };
  }

  if (pagePath.startsWith("/dashboard")) {
    return {
      category: "user" as const,
      scopeKey: "user_dashboard",
      scopeLabel: "User dashboard",
      surfaceKey: "user:dashboard",
      surfaceLabel: "User dashboard",
    };
  }

  if (pagePath === "/faq") {
    return {
      category: "global" as const,
      scopeKey: "global_faq",
      scopeLabel: "FAQ",
      surfaceKey: "global:faq",
      surfaceLabel: "FAQ",
    };
  }

  if (pagePath === "/") {
    return {
      category: "global" as const,
      scopeKey: "global_home",
      scopeLabel: "Homepage",
      surfaceKey: "global:home",
      surfaceLabel: "Homepage",
    };
  }

  return {
    category: "global" as const,
    scopeKey: "global_site",
    scopeLabel: "Public site",
    surfaceKey: "global:site",
    surfaceLabel: "Public site",
  };
}

export function resolveAnalyticsSemanticContext(input: {
  pagePath?: string | null;
  dropId?: string | null;
  dropCategory?: string | null;
  semanticCategory?: string | null;
  semanticCategoryLabel?: string | null;
  semanticScopeKey?: string | null;
  semanticScopeLabel?: string | null;
  semanticSurfaceKey?: string | null;
  semanticSurfaceLabel?: string | null;
  userRole?: string | null;
}) {
  const pagePath = normalizePagePath(input.pagePath);
  const dropId = input.dropId?.trim() || undefined;
  const dropCategory = input.dropCategory?.trim() || undefined;
  const descriptor = buildScopeDescriptor(pagePath, dropId, dropCategory);
  const category = (input.semanticCategory?.trim() as AnalyticsSemanticCategory | undefined) || descriptor.category;

  return {
    category,
    categoryLabel: input.semanticCategoryLabel?.trim() || ANALYTICS_SEMANTIC_CATEGORY_LABELS[category],
    scopeKey: input.semanticScopeKey?.trim() || descriptor.scopeKey,
    scopeLabel: input.semanticScopeLabel?.trim() || descriptor.scopeLabel,
    surfaceKey: input.semanticSurfaceKey?.trim() || descriptor.surfaceKey,
    surfaceLabel: input.semanticSurfaceLabel?.trim() || descriptor.surfaceLabel,
    pagePath,
    dropId,
    dropCategory,
    userRole: input.userRole?.trim() || undefined,
  } satisfies AnalyticsSemanticContext;
}

export function buildAnalyticsSemanticParams(input: {
  pagePath?: string | null;
  dropId?: string | null;
  dropCategory?: string | null;
  semanticCategory?: string | null;
  semanticCategoryLabel?: string | null;
  semanticScopeKey?: string | null;
  semanticScopeLabel?: string | null;
  semanticSurfaceKey?: string | null;
  semanticSurfaceLabel?: string | null;
  userRole?: string | null;
}) {
  const context = resolveAnalyticsSemanticContext(input);

  return {
    semantic_category: context.category,
    semantic_category_label: context.categoryLabel,
    semantic_scope_key: context.scopeKey,
    semantic_scope_label: context.scopeLabel,
    semantic_surface_key: context.surfaceKey,
    semantic_surface_label: context.surfaceLabel,
  };
}

export function resolveRawInteractionLabel(eventType: string | null | undefined) {
  switch (eventType) {
    case "page_view":
      return "Page viewed";
    case "page_leave":
      return "Page left";
    case "click":
      return "Clicked";
    case "hover":
      return "Hovered";
    case "scroll":
      return "Scrolled";
    case "visibility":
      return "Tab visibility changed";
    default:
      return humanizeAnalyticsKey(eventType);
  }
}
