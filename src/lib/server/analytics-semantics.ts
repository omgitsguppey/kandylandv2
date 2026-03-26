import "server-only";

import {
  ANALYTICS_SEMANTIC_CATEGORY_LABELS,
  AnalyticsSemanticCategory,
  getLegacyPagePathForEvent,
  humanizeAnalyticsKey,
  resolveAnalyticsSemanticContext,
} from "@/lib/analytics-semantics";

export interface AnalyticsSemanticCategorySummary {
  key: AnalyticsSemanticCategory;
  label: string;
  viewCount: number;
  viewDurationMs: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  exitCount: number;
  clickCount: number;
  hoverCount: number;
  pagesVisited: number;
  signInCount: number;
  returnCount: number;
  logoutCount: number;
  watchSecondsTotal: number;
  watchSessionCount: number;
}

interface SemanticMetricDelta {
  viewCount?: number;
  viewDurationMs?: number;
  engagedViewCount?: number;
  passiveViewCount?: number;
  bounceCount?: number;
  exitCount?: number;
  clickCount?: number;
  hoverCount?: number;
  pagePath?: string;
  signInCount?: number;
  returnCount?: number;
  logoutCount?: number;
  watchSecondsTotal?: number;
  watchSessionCount?: number;
}

interface GuestSemanticEventRecord {
  type?: string;
  path?: string;
  dropId?: string;
  dropCategory?: string;
  durationMs?: number;
  watchSeconds?: number;
  interactionState?: string;
  exitIntent?: string;
  clickCount?: number;
  hoverCount?: number;
  scrollCount?: number;
}

interface TelemetrySemanticRecord {
  eventName?: string;
  pagePath?: string;
  dropId?: string;
  dropCategory?: string;
  durationMs?: number;
  watchSeconds?: number;
  sessionWatchSeconds?: number;
  semanticCategory?: string;
  semanticScopeKey?: string;
  semanticScopeLabel?: string;
  clickCount?: number;
}

function createEmptySummary(category: AnalyticsSemanticCategory): AnalyticsSemanticCategorySummary {
  return {
    key: category,
    label: ANALYTICS_SEMANTIC_CATEGORY_LABELS[category],
    viewCount: 0,
    viewDurationMs: 0,
    engagedViewCount: 0,
    passiveViewCount: 0,
    bounceCount: 0,
    exitCount: 0,
    clickCount: 0,
    hoverCount: 0,
    pagesVisited: 0,
    signInCount: 0,
    returnCount: 0,
    logoutCount: 0,
    watchSecondsTotal: 0,
    watchSessionCount: 0,
  };
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function createDocKey(dayKey: string, category: string, scopeKey: string) {
  const encodedScope = Buffer.from(scopeKey).toString("base64url").slice(0, 120) || "root";
  return `${dayKey}__${category}__${encodedScope}`;
}

function buildGuestSemanticDelta(record: GuestSemanticEventRecord): SemanticMetricDelta | null {
  const type = asString(record.type);

  if (type === "page_view") {
    return {
      viewCount: 1,
      pagePath: asString(record.path),
    };
  }

  if (type === "click") {
    return {
      clickCount: 1,
      pagePath: asString(record.path),
    };
  }

  if (type === "hover") {
    return {
      hoverCount: 1,
      pagePath: asString(record.path),
    };
  }

  if (type === "page_leave") {
    const durationMs = Math.max(0, asNumber(record.durationMs));
    const interactionState = asString(record.interactionState);
    const exitIntent = asString(record.exitIntent);
    return {
      viewDurationMs: durationMs,
      engagedViewCount: interactionState === "engaged" ? 1 : 0,
      passiveViewCount: interactionState === "passive" ? 1 : 0,
      bounceCount: exitIntent === "bounce" ? 1 : 0,
      exitCount: 1,
      pagePath: asString(record.path),
    };
  }

  return null;
}

function buildTelemetrySemanticDelta(
  record: TelemetrySemanticRecord,
  options?: {
    preferSemanticPageSignals?: boolean;
    preferSemanticClickSignals?: boolean;
  },
): SemanticMetricDelta | null {
  const eventName = asString(record.eventName);
  const pagePath = asString(record.pagePath) || getLegacyPagePathForEvent(eventName);

  switch (eventName) {
    case "semantic_page_viewed":
      return { viewCount: 1, pagePath };
    case "home_page_viewed":
    case "privacy_page_viewed":
    case "terms_page_viewed":
    case "dashboard_viewed":
    case "library_viewed":
    case "profile_settings_viewed":
    case "experience_hub_viewed":
    case "drops_page_viewed":
    case "faq_page_viewed":
    case "admin_dashboard_viewed":
    case "admin_analytics_viewed":
    case "admin_debug_viewed":
    case "admin_users_viewed":
    case "admin_content_viewed":
    case "admin_drops_viewed":
    case "admin_queue_viewed":
    case "admin_roster_viewed":
    case "admin_user_detail_viewed":
    case "viewer_opened":
      return options?.preferSemanticPageSignals ? null : { viewCount: 1, pagePath };
    case "semantic_page_engaged":
      return {
        engagedViewCount: 1,
        viewDurationMs: Math.max(0, asNumber(record.durationMs)),
        pagePath,
      };
    case "semantic_page_passive":
      return {
        passiveViewCount: 1,
        viewDurationMs: Math.max(0, asNumber(record.durationMs)),
        pagePath,
      };
    case "semantic_page_bounced":
      return {
        bounceCount: 1,
        exitCount: 1,
        pagePath,
      };
    case "semantic_page_exited":
      return { exitCount: 1, pagePath };
    case "semantic_target_clicked":
      return {
        clickCount: Math.max(1, asNumber(record.clickCount) || 1),
        pagePath,
      };
    case "navigation_click":
    case "daily_task_action_clicked":
    case "drop_clicked":
    case "view_drop_details":
    case "drop_preview_opened":
    case "drop_unlock_attempted":
    case "unlock_drop_success":
    case "viewer_related_drop_clicked":
      return options?.preferSemanticClickSignals
        ? null
        : {
            clickCount: Math.max(1, asNumber(record.clickCount) || 1),
            pagePath,
          };
    case "auth_sign_in_success":
    case "auth_google_sign_in_success":
    case "auth_sign_up_success":
      return { signInCount: 1, pagePath };
    case "auth_session_restored":
      return { returnCount: 1, pagePath };
    case "auth_logout":
      return { logoutCount: 1, pagePath };
    case "viewer_session_completed": {
      const watchSeconds = Math.max(
        asNumber(record.sessionWatchSeconds),
        asNumber(record.watchSeconds),
      );
      return {
        watchSecondsTotal: watchSeconds,
        watchSessionCount: watchSeconds > 0 ? 1 : 0,
        pagePath: pagePath || "/dashboard/viewer",
      };
    }
    default:
      return null;
  }
}

function applyDelta(
  summaries: Map<AnalyticsSemanticCategory, AnalyticsSemanticCategorySummary>,
  pageSets: Map<AnalyticsSemanticCategory, Set<string>>,
  category: AnalyticsSemanticCategory,
  delta: SemanticMetricDelta,
) {
  const summary = summaries.get(category) ?? createEmptySummary(category);
  summary.viewCount += delta.viewCount ?? 0;
  summary.viewDurationMs += delta.viewDurationMs ?? 0;
  summary.engagedViewCount += delta.engagedViewCount ?? 0;
  summary.passiveViewCount += delta.passiveViewCount ?? 0;
  summary.bounceCount += delta.bounceCount ?? 0;
  summary.exitCount += delta.exitCount ?? 0;
  summary.clickCount += delta.clickCount ?? 0;
  summary.hoverCount += delta.hoverCount ?? 0;
  summary.signInCount += delta.signInCount ?? 0;
  summary.returnCount += delta.returnCount ?? 0;
  summary.logoutCount += delta.logoutCount ?? 0;
  summary.watchSecondsTotal += delta.watchSecondsTotal ?? 0;
  summary.watchSessionCount += delta.watchSessionCount ?? 0;

  if (delta.pagePath) {
    const pages = pageSets.get(category) ?? new Set<string>();
    pages.add(delta.pagePath);
    pageSets.set(category, pages);
    summary.pagesVisited = pages.size;
  }

  summaries.set(category, summary);
}

export function buildSemanticCategorySummaries(input: {
  eventFacts?: Array<Record<string, unknown>>;
  guestBatches?: Array<Record<string, unknown>>;
  sessionFacts?: Array<Record<string, unknown>>;
}) {
  const summaries = new Map<AnalyticsSemanticCategory, AnalyticsSemanticCategorySummary>();
  const pageSets = new Map<AnalyticsSemanticCategory, Set<string>>();
  const hasSemanticPageSignals = (input.eventFacts ?? []).some((fact) => asString(fact.eventName) === "semantic_page_viewed");
  const hasSemanticClickSignals = (input.eventFacts ?? []).some((fact) => asString(fact.eventName) === "semantic_target_clicked");
  const hasViewerWatchSignals = (input.eventFacts ?? []).some((fact) => asString(fact.eventName) === "viewer_session_completed");

  (input.eventFacts ?? []).forEach((fact) => {
    const params = (fact.params as Record<string, unknown> | undefined) ?? {};
    const pagePath = asString(fact.pagePath) || asString(params.page_path) || getLegacyPagePathForEvent(asString(fact.eventName));
    const dropId = asString(fact.dropId) || asString(params.drop_id);
    const dropCategory = asString(fact.dropCategory) || asString(params.drop_category);
    const semanticCategory = resolveAnalyticsSemanticContext({
      pagePath,
      dropId,
      dropCategory,
    }).category;

    const delta = buildTelemetrySemanticDelta({
      eventName: asString(fact.eventName),
      pagePath,
      dropId,
      dropCategory,
      durationMs: asNumber(fact.durationMs) || asNumber(params.duration_ms),
      watchSeconds: asNumber(fact.watchSeconds) || asNumber(params.watch_seconds),
      sessionWatchSeconds: asNumber(fact.sessionWatchSeconds) || asNumber(params.session_watch_seconds),
      semanticCategory: asString(params.semantic_category),
      semanticScopeKey: asString(params.semantic_scope_key),
      semanticScopeLabel: asString(params.semantic_scope_label),
      clickCount: asNumber(params.click_count),
    }, {
      preferSemanticPageSignals: hasSemanticPageSignals,
      preferSemanticClickSignals: hasSemanticClickSignals,
    });

    if (delta) {
      applyDelta(summaries, pageSets, semanticCategory as AnalyticsSemanticCategory, delta);
    }
  });

  (input.guestBatches ?? []).forEach((batch) => {
    const events = Array.isArray(batch.events) ? batch.events as Array<Record<string, unknown>> : [];
    events.forEach((event) => {
      const delta = buildGuestSemanticDelta({
        type: asString(event.type),
        path: asString(event.path),
        dropId: asString(event.dropId),
        dropCategory: asString(event.dropCategory),
        durationMs: asNumber(event.durationMs),
        watchSeconds: asNumber(event.watchSeconds),
        interactionState: asString(event.interactionState),
        exitIntent: asString(event.exitIntent),
        clickCount: asNumber(event.clickCount),
        hoverCount: asNumber(event.hoverCount),
        scrollCount: asNumber(event.scrollCount),
      });

      if (!delta) {
        return;
      }

      const context = resolveAnalyticsSemanticContext({
        pagePath: asString(event.path),
        dropId: asString(event.dropId),
        dropCategory: asString(event.dropCategory),
      });

      applyDelta(summaries, pageSets, context.category, delta);
    });
  });

  if (!hasViewerWatchSignals) {
    (input.sessionFacts ?? []).forEach((sessionFact) => {
      const watchSeconds = asNumber(sessionFact.watchSecondsTotal);
      const startedCount = asNumber(sessionFact.startedCount);
      if (watchSeconds <= 0 && startedCount <= 0) {
        return;
      }

      applyDelta(summaries, pageSets, "drop", {
        watchSecondsTotal: watchSeconds,
        watchSessionCount: startedCount,
        pagePath: "/dashboard/viewer",
        viewCount: startedCount,
      });
    });
  }

  return (["global", "user", "admin", "drop"] as AnalyticsSemanticCategory[]).map((category) =>
    summaries.get(category) ?? createEmptySummary(category),
  );
}

export function summarizeSecurityReason(reason: string | null | undefined) {
  if (!reason) {
    return "Protection warning";
  }

  if (reason === "screenshot_hotkey") return "Screenshot shortcut";
  if (reason === "screenshot_shortcut_mac_capture") return "macOS screenshot";
  if (reason === "screenshot_shortcut_mac_area") return "macOS area screenshot";
  if (reason === "screen_record_shortcut_mac_toolbar") return "macOS capture toolbar";
  if (reason === "screenshot_shortcut_windows_snip") return "Windows snipping shortcut";
  if (reason === "screenshot_shortcut_printscreen") return "Print Screen";
  if (reason === "screen_record_shortcut_windows_gamebar") return "Windows screen recording";
  if (reason === "print_shortcut") return "Print shortcut";
  if (reason === "save_shortcut") return "Save shortcut";
  if (reason === "copy_shortcut") return "Copy shortcut";
  if (reason === "selection_attempt") return "Selection attempt";
  if (reason === "drag_export_attempt") return "Drag export attempt";
  if (reason === "context_menu_attempt") return "Context menu attempt";
  if (reason === "devtools_shortcut") return "Developer tools shortcut";
  if (reason === "source_view_shortcut") return "View source shortcut";
  if (reason === "rapid_visibility_capture_pattern") return "Rapid capture pattern";

  return humanizeAnalyticsKey(reason);
}
