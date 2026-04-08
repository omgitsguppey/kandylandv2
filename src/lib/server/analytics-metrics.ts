import "server-only";

import {
  ANALYTICS_METRIC_CATALOG_VERSION,
  ANALYTICS_METRIC_CATEGORY_LABELS,
  ANALYTICS_SOCIAL_METRICS_BY_KEY,
  ANALYTICS_SOCIAL_METRIC_DEFINITIONS,
  formatAnalyticsMetricValue,
} from "@/lib/analytics-metric-catalog";
import { getLegacyPagePathForEvent } from "@/lib/analytics-semantics";
import {
  AnalyticsEventFactRecord,
  AnalyticsGuestBatchRecord,
  AnalyticsGuestEventRecord,
  AnalyticsMetricCategory,
  AnalyticsMetricCategoryGroup,
  AnalyticsMetricDefinition,
  AnalyticsMetricResult,
  AnalyticsSessionFactRecord,
} from "@/types/analytics";

interface AnalyticsMetricEngineInput {
  eventFacts?: AnalyticsEventFactRecord[];
  guestBatches?: AnalyticsGuestBatchRecord[];
  sessionFacts?: AnalyticsSessionFactRecord[];
  eventCounts?: Record<string, number>;
  onboarding?: {
    registrations: number;
    starts: number;
    stepStarts: number;
    stepCompletions: number;
  };
}

interface SessionSummary {
  sessionId: string;
  actorId: string;
  pageViews: number;
  pages: Set<string>;
  userSurfaces: Set<string>;
  adminPages: Set<string>;
  hasHome: boolean;
  hasDashboard: boolean;
  hasLibrary: boolean;
  hasExperiences: boolean;
  hasProfile: boolean;
  hasAdmin: boolean;
  hasAdminAnalytics: boolean;
  hasAdminUser: boolean;
  hasDropSurface: boolean;
  clickCount: number;
  hoverCount: number;
  scrollCount: number;
  exits: number;
  engagedExits: number;
  fastBounces: number;
  deepScroll: boolean;
}

interface ViewerAccumulator {
  startedSessions: number;
  completedSessions: number;
  highWatchSessions: number;
  actorSessionCounts: Map<string, number>;
}

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function resolvePagePathFromFact(fact: AnalyticsEventFactRecord) {
  const params = (fact.params ?? {}) as Record<string, unknown>;
  return normalizePagePath(
    toStringValue(fact.pagePath)
    || toStringValue(params.page_path)
    || getLegacyPagePathForEvent(toStringValue(fact.eventName)),
  );
}

function resolveSessionIdFromFact(fact: AnalyticsEventFactRecord) {
  const params = (fact.params ?? {}) as Record<string, unknown>;
  const explicitSessionId = toStringValue(fact.sessionId) || toStringValue(params.session_id);
  if (explicitSessionId) {
    return `fact:${explicitSessionId}`;
  }

  const actorSeed = toStringValue(fact.userId) || toStringValue(fact.username) || "anon";
  const timestampBucket = Math.floor(toNumber(fact.timestamp) / (30 * 60 * 1000));
  return `fact:${actorSeed}:${timestampBucket}`;
}

function resolveActorIdFromFact(fact: AnalyticsEventFactRecord) {
  const params = (fact.params ?? {}) as Record<string, unknown>;
  const userId = toStringValue(fact.userId);
  if (userId) {
    return `user:${userId}`;
  }

  const username = toStringValue(fact.username);
  if (username) {
    return `user:${username}`;
  }

  const explicitSessionId = toStringValue(fact.sessionId) || toStringValue(params.session_id);
  if (explicitSessionId) {
    return `fact-actor:${explicitSessionId}`;
  }

  return `fact-actor:${Math.floor(toNumber(fact.timestamp) / (24 * 60 * 60 * 1000))}`;
}

function resolveSessionIdFromGuestBatch(batch: AnalyticsGuestBatchRecord) {
  const sessionKey = toStringValue(batch.sessionKey) || "anon";
  const clientSessionId = toStringValue(batch.clientSessionId);
  const receivedBucket = Math.floor(toNumber(batch.receivedAtMs) / (30 * 60 * 1000));
  return `guest:${sessionKey}:${clientSessionId || receivedBucket}`;
}

function resolveActorIdFromGuestBatch(batch: AnalyticsGuestBatchRecord) {
  const sessionKey = toStringValue(batch.sessionKey);
  if (sessionKey) {
    return `guest:${sessionKey}`;
  }

  const clientSessionId = toStringValue(batch.clientSessionId);
  if (clientSessionId) {
    return `guest:${clientSessionId}`;
  }

  return `guest:${Math.floor(toNumber(batch.receivedAtMs) / (24 * 60 * 60 * 1000))}`;
}

function getOrCreateSession(
  sessions: Map<string, SessionSummary>,
  sessionId: string,
  actorId: string,
) {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const created: SessionSummary = {
    sessionId,
    actorId,
    pageViews: 0,
    pages: new Set<string>(),
    userSurfaces: new Set<string>(),
    adminPages: new Set<string>(),
    hasHome: false,
    hasDashboard: false,
    hasLibrary: false,
    hasExperiences: false,
    hasProfile: false,
    hasAdmin: false,
    hasAdminAnalytics: false,
    hasAdminUser: false,
    hasDropSurface: false,
    clickCount: 0,
    hoverCount: 0,
    scrollCount: 0,
    exits: 0,
    engagedExits: 0,
    fastBounces: 0,
    deepScroll: false,
  };
  sessions.set(sessionId, created);
  return created;
}

function applyPageSurface(summary: SessionSummary, pagePath: string) {
  if (!pagePath) {
    return;
  }

  summary.pages.add(pagePath);

  if (pagePath === "/") {
    summary.hasHome = true;
  }

  if (pagePath === "/dashboard") {
    summary.hasDashboard = true;
    summary.userSurfaces.add("dashboard");
  }

  if (pagePath.startsWith("/dashboard/library")) {
    summary.hasLibrary = true;
    summary.userSurfaces.add("library");
  }

  if (pagePath.startsWith("/dashboard/profile")) {
    summary.hasProfile = true;
    summary.userSurfaces.add("profile");
  }

  if (pagePath.startsWith("/experiences")) {
    summary.hasExperiences = true;
    summary.userSurfaces.add("experiences");
  }

  if (pagePath.startsWith("/admin")) {
    summary.hasAdmin = true;
    summary.adminPages.add(pagePath);
  }

  if (pagePath.startsWith("/admin/analytics")) {
    summary.hasAdminAnalytics = true;
  }

  if (pagePath.startsWith("/admin/user")) {
    summary.hasAdminUser = true;
  }

  if (pagePath.startsWith("/drops") || pagePath.startsWith("/dashboard/viewer")) {
    summary.hasDropSurface = true;
  }
}

function isPageViewEvent(eventName: string) {
  return new Set([
    "semantic_page_viewed",
    "home_page_viewed",
    "privacy_page_viewed",
    "terms_page_viewed",
    "dashboard_viewed",
    "library_viewed",
    "profile_settings_viewed",
    "experience_hub_viewed",
    "drops_page_viewed",
    "faq_page_viewed",
    "admin_dashboard_viewed",
    "admin_analytics_viewed",
    "admin_debug_viewed",
    "admin_users_viewed",
    "admin_content_viewed",
    "admin_drops_viewed",
    "admin_queue_viewed",
    "admin_roster_viewed",
    "admin_user_detail_viewed",
    "viewer_opened",
  ]).has(eventName);
}

function isClickLikeEvent(eventName: string) {
  return new Set([
    "semantic_target_clicked",
    "navigation_click",
    "daily_task_action_clicked",
    "drop_clicked",
    "view_drop_details",
    "drop_preview_opened",
    "drop_unlock_attempted",
    "unlock_drop_success",
    "viewer_related_drop_clicked",
  ]).has(eventName);
}

function buildSessionSummaries(input: AnalyticsMetricEngineInput) {
  const sessions = new Map<string, SessionSummary>();

  (input.eventFacts ?? []).forEach((fact) => {
    const eventName = toStringValue(fact.eventName);
    const params = (fact.params ?? {}) as Record<string, unknown>;
    const pagePath = resolvePagePathFromFact(fact);
    const sessionId = resolveSessionIdFromFact(fact);
    const actorId = resolveActorIdFromFact(fact);
    const summary = getOrCreateSession(sessions, sessionId, actorId);
    const dropId = toStringValue(fact.dropId) || toStringValue(params.drop_id);

    applyPageSurface(summary, pagePath);

    if (isPageViewEvent(eventName)) {
      summary.pageViews += 1;
    }

    if (isClickLikeEvent(eventName)) {
      summary.clickCount += Math.max(1, toNumber(params.click_count) || 1);
    }

    if (eventName === "semantic_page_engaged") {
      summary.exits += 1;
      summary.engagedExits += 1;
    }

    if (eventName === "semantic_page_passive" || eventName === "semantic_page_exited") {
      summary.exits += 1;
    }

    if (eventName === "semantic_page_bounced") {
      summary.exits += 1;
      summary.fastBounces += 1;
    }

    if (toNumber(params.scroll_depth_percent) >= 75) {
      summary.deepScroll = true;
    }

    if (dropId || eventName.startsWith("viewer_") || eventName.startsWith("drop_") || eventName.startsWith("unlock_")) {
      summary.hasDropSurface = true;
    }
  });

  (input.guestBatches ?? []).forEach((batch) => {
    const sessionId = resolveSessionIdFromGuestBatch(batch);
    const actorId = resolveActorIdFromGuestBatch(batch);
    const summary = getOrCreateSession(sessions, sessionId, actorId);

    (batch.events ?? []).forEach((event: AnalyticsGuestEventRecord) => {
      const pagePath = normalizePagePath(toStringValue(event.path));
      applyPageSurface(summary, pagePath);

      if (event.type === "page_view") {
        summary.pageViews += 1;
      }

      if (event.type === "click") {
        summary.clickCount += Math.max(1, toNumber(event.clickCount) || 1);
      }

      if (event.type === "hover") {
        summary.hoverCount += Math.max(1, toNumber(event.hoverCount) || 1);
      }

      if (event.type === "scroll") {
        summary.scrollCount += Math.max(1, toNumber(event.scrollCount) || 1);
      }

      if (toNumber(event.scrollDepthPercent) >= 75) {
        summary.deepScroll = true;
      }

      if (event.type === "page_leave") {
        summary.exits += 1;
        if (toStringValue(event.interactionState) === "engaged") {
          summary.engagedExits += 1;
        }

        if (toStringValue(event.exitIntent) === "bounce" || toNumber(event.durationMs) <= 3_000) {
          summary.fastBounces += 1;
        }
      }

      if (toStringValue(event.dropId) || pagePath.startsWith("/drops") || pagePath.startsWith("/dashboard/viewer")) {
        summary.hasDropSurface = true;
      }
    });
  });

  return sessions;
}

function buildViewerAccumulator(input: AnalyticsMetricEngineInput) {
  const accumulator: ViewerAccumulator = {
    startedSessions: 0,
    completedSessions: 0,
    highWatchSessions: 0,
    actorSessionCounts: new Map<string, number>(),
  };

  (input.sessionFacts ?? []).forEach((fact) => {
    const startedCount = Math.max(0, toNumber(fact.startedCount));
    const completedCount = Math.max(0, toNumber(fact.completedCount));
    const watchSeconds = Math.max(0, toNumber(fact.watchSecondsTotal));

    accumulator.startedSessions += startedCount;
    accumulator.completedSessions += completedCount;

    if (startedCount > 0 && watchSeconds >= 60) {
      accumulator.highWatchSessions += 1;
    }

    const actorId = toStringValue(fact.userId) || toStringValue(fact.username) || toStringValue(fact.sessionId);
    if (actorId && startedCount > 0) {
      accumulator.actorSessionCounts.set(
        actorId,
        (accumulator.actorSessionCounts.get(actorId) || 0) + 1,
      );
    }
  });

  return accumulator;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function createResult(
  definition: AnalyticsMetricDefinition,
  value: number,
  sampleSize: number,
  supportingValues: Record<string, number>,
): AnalyticsMetricResult {
  return {
    ...definition,
    value,
    formattedValue: formatAnalyticsMetricValue(value, definition.valueType),
    status: sampleSize <= 0 ? "empty" : definition.reliability === "directional" ? "partial" : "healthy",
    sampleSize,
    supportingValues,
  };
}

export function buildAnalyticsMetricReport(input: AnalyticsMetricEngineInput) {
  const eventCounts = input.eventCounts ?? {};
  const sessions = buildSessionSummaries(input);
  const viewer = buildViewerAccumulator(input);

  const reachedSessions = sessions.size;
  let totalPageViews = 0;
  let multiPageSessions = 0;
  let exitingSessions = 0;
  let fastBounceSessions = 0;
  let deepScrollSessions = 0;
  let engagedExitSessions = 0;
  let homepageSessions = 0;
  let homeToDashboardSessions = 0;
  let totalInteractionSignals = 0;

  let userSessions = 0;
  let dashboardSessions = 0;
  let librarySessions = 0;
  let experiencesSessions = 0;
  let profileSessions = 0;
  let crossSurfaceUserSessions = 0;

  let adminSessions = 0;
  let adminMultiPageSessions = 0;
  let adminAnalyticsSessions = 0;
  let adminUserSessions = 0;
  let adminEngagedSessions = 0;

  let dropSurfaceSessions = 0;

  const globalActorsSet = new Map<string, number>();
  const adminActorsSet = new Map<string, number>();

  for (const session of sessions.values()) {
    totalPageViews += session.pageViews;
    totalInteractionSignals += session.clickCount + session.hoverCount + session.scrollCount;

    if (session.pages.size > 1) multiPageSessions += 1;
    if (session.exits > 0) exitingSessions += 1;
    if (session.fastBounces > 0) fastBounceSessions += 1;
    if (session.deepScroll) deepScrollSessions += 1;
    if (session.engagedExits > 0) engagedExitSessions += 1;

    if (session.hasHome) {
      homepageSessions += 1;
      if (session.hasDashboard) homeToDashboardSessions += 1;
    }

    if (session.userSurfaces.size > 0 || session.hasDashboard) userSessions += 1;
    if (session.hasDashboard) dashboardSessions += 1;
    if (session.hasLibrary) librarySessions += 1;
    if (session.hasExperiences) experiencesSessions += 1;
    if (session.hasProfile) profileSessions += 1;
    if (session.userSurfaces.size >= 2) crossSurfaceUserSessions += 1;

    if (session.hasAdmin) {
      adminSessions += 1;
      if (session.adminPages.size > 1) adminMultiPageSessions += 1;
      if (session.hasAdminAnalytics) adminAnalyticsSessions += 1;
      if (session.hasAdminUser) adminUserSessions += 1;
      if (session.engagedExits > 0) adminEngagedSessions += 1;

      adminActorsSet.set(session.actorId, (adminActorsSet.get(session.actorId) || 0) + 1);
    }

    if (session.hasDropSurface) dropSurfaceSessions += 1;

    globalActorsSet.set(session.actorId, (globalActorsSet.get(session.actorId) || 0) + 1);
  }

  const globalActors = {
    totalActors: globalActorsSet.size,
    returningActors: Array.from(globalActorsSet.values()).filter((count) => count > 1).length,
  };

  const adminActors = {
    totalActors: adminActorsSet.size,
    returningActors: Array.from(adminActorsSet.values()).filter((count) => count > 1).length,
  };

  const registrations = Math.max(0, input.onboarding?.registrations || 0);
  const onboardingStarts = Math.max(0, input.onboarding?.starts || 0);
  const onboardingStepStarts = Math.max(0, input.onboarding?.stepStarts || 0);
  const onboardingStepCompletions = Math.max(0, input.onboarding?.stepCompletions || 0);

  const uniqueViewerActors = viewer.actorSessionCounts.size;
  const repeatViewerActors = Array.from(viewer.actorSessionCounts.values()).filter((count) => count > 1).length;

  const metricValues = {
    view_frequency: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.view_frequency,
      ratio(totalPageViews, reachedSessions),
      reachedSessions,
      { totalPageViews, reachedSessions },
    ),
    multi_page_session_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.multi_page_session_rate,
      percent(multiPageSessions, reachedSessions),
      reachedSessions,
      { multiPageSessions, reachedSessions },
    ),
    fast_bounce_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.fast_bounce_rate,
      percent(fastBounceSessions, reachedSessions),
      reachedSessions,
      { fastBounceSessions, reachedSessions },
    ),
    deep_scroll_session_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.deep_scroll_session_rate,
      percent(deepScrollSessions, reachedSessions),
      reachedSessions,
      { deepScrollSessions, reachedSessions },
    ),
    returning_actor_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.returning_actor_rate,
      percent(globalActors.returningActors, globalActors.totalActors),
      globalActors.totalActors,
      globalActors,
    ),
    home_to_dashboard_transition_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.home_to_dashboard_transition_rate,
      percent(homeToDashboardSessions, homepageSessions),
      homepageSessions,
      { homeToDashboardSessions, homepageSessions },
    ),
    interaction_intensity: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.interaction_intensity,
      ratio(totalInteractionSignals, reachedSessions),
      reachedSessions,
      { totalInteractionSignals, reachedSessions },
    ),
    engaged_exit_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.engaged_exit_rate,
      percent(engagedExitSessions, exitingSessions),
      exitingSessions,
      { engagedExitSessions, exitingSessions },
    ),
    library_visit_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.library_visit_rate,
      percent(librarySessions, userSessions),
      userSessions,
      { librarySessions, userSessions },
    ),
    experiences_visit_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.experiences_visit_rate,
      percent(experiencesSessions, userSessions),
      userSessions,
      { experiencesSessions, userSessions },
    ),
    profile_visit_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.profile_visit_rate,
      percent(profileSessions, userSessions),
      userSessions,
      { profileSessions, userSessions },
    ),
    cross_surface_journey_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.cross_surface_journey_rate,
      percent(crossSurfaceUserSessions, userSessions),
      userSessions,
      { crossSurfaceUserSessions, userSessions },
    ),
    checkin_conversion_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.checkin_conversion_rate,
      percent(toNumber(eventCounts.daily_check_in_claim), dashboardSessions),
      dashboardSessions,
      { dashboardSessions, dailyCheckIns: toNumber(eventCounts.daily_check_in_claim) },
    ),
    notification_opt_in_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.notification_opt_in_rate,
      percent(
        toNumber(eventCounts.task_notifications_enabled),
        toNumber(eventCounts.notification_prompt_banner_viewed),
      ),
      toNumber(eventCounts.notification_prompt_banner_viewed),
      {
        notificationEnables: toNumber(eventCounts.task_notifications_enabled),
        notificationPromptViews: toNumber(eventCounts.notification_prompt_banner_viewed),
      },
    ),
    task_guidance_completion_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.task_guidance_completion_rate,
      percent(
        toNumber(eventCounts.task_guidance_completed),
        toNumber(eventCounts.task_guidance_banner_viewed),
      ),
      toNumber(eventCounts.task_guidance_banner_viewed),
      {
        taskGuidanceCompleted: toNumber(eventCounts.task_guidance_completed),
        taskGuidanceViewed: toNumber(eventCounts.task_guidance_banner_viewed),
      },
    ),
    signup_to_onboarding_start_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.signup_to_onboarding_start_rate,
      percent(onboardingStarts, registrations),
      registrations,
      { onboardingStarts, registrations },
    ),
    onboarding_step_completion_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.onboarding_step_completion_rate,
      percent(onboardingStepCompletions, onboardingStepStarts),
      onboardingStepStarts,
      { onboardingStepCompletions, onboardingStepStarts },
    ),
    admin_multi_page_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.admin_multi_page_rate,
      percent(adminMultiPageSessions, adminSessions),
      adminSessions,
      { adminMultiPageSessions, adminSessions },
    ),
    analytics_review_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.analytics_review_rate,
      percent(adminAnalyticsSessions, adminSessions),
      adminSessions,
      { adminAnalyticsSessions, adminSessions },
    ),
    user_drilldown_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.user_drilldown_rate,
      percent(adminUserSessions, adminAnalyticsSessions),
      adminAnalyticsSessions,
      { adminUserSessions, adminAnalyticsSessions },
    ),
    admin_engaged_session_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.admin_engaged_session_rate,
      percent(adminEngagedSessions, adminSessions),
      adminSessions,
      { adminEngagedSessions, adminSessions },
    ),
    admin_returning_actor_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.admin_returning_actor_rate,
      percent(adminActors.returningActors, adminActors.totalActors),
      adminActors.totalActors,
      adminActors,
    ),
    drop_catalog_reach_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.drop_catalog_reach_rate,
      percent(dropSurfaceSessions, reachedSessions),
      reachedSessions,
      { dropSurfaceSessions, reachedSessions },
    ),
    preview_click_through_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.preview_click_through_rate,
      percent(toNumber(eventCounts.drop_preview_opened), toNumber(eventCounts.drop_card_impression)),
      toNumber(eventCounts.drop_card_impression),
      {
        dropPreviewOpens: toNumber(eventCounts.drop_preview_opened),
        dropCardImpressions: toNumber(eventCounts.drop_card_impression),
      },
    ),
    preview_to_unlock_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.preview_to_unlock_rate,
      percent(toNumber(eventCounts.unlock_drop_success), toNumber(eventCounts.drop_preview_opened)),
      toNumber(eventCounts.drop_preview_opened),
      {
        unlocks: toNumber(eventCounts.unlock_drop_success),
        previews: toNumber(eventCounts.drop_preview_opened),
      },
    ),
    unlock_to_viewer_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.unlock_to_viewer_rate,
      percent(toNumber(eventCounts.viewer_opened), toNumber(eventCounts.unlock_drop_success)),
      toNumber(eventCounts.unlock_drop_success),
      {
        viewerOpens: toNumber(eventCounts.viewer_opened),
        unlocks: toNumber(eventCounts.unlock_drop_success),
      },
    ),
    viewer_completion_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.viewer_completion_rate,
      percent(viewer.completedSessions, viewer.startedSessions),
      viewer.startedSessions,
      {
        viewerCompletedSessions: viewer.completedSessions,
        viewerStartedSessions: viewer.startedSessions,
      },
    ),
    high_watch_depth_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.high_watch_depth_rate,
      percent(viewer.highWatchSessions, viewer.startedSessions),
      viewer.startedSessions,
      {
        viewerHighWatchSessions: viewer.highWatchSessions,
        viewerStartedSessions: viewer.startedSessions,
      },
    ),
    repeat_viewer_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.repeat_viewer_rate,
      percent(repeatViewerActors, uniqueViewerActors),
      uniqueViewerActors,
      {
        repeatViewerActors,
        uniqueViewerActors,
      },
    ),
    drop_share_rate: createResult(
      ANALYTICS_SOCIAL_METRICS_BY_KEY.drop_share_rate,
      percent(toNumber(eventCounts.drop_share_copied), toNumber(eventCounts.viewer_opened)),
      toNumber(eventCounts.viewer_opened),
      {
        dropShares: toNumber(eventCounts.drop_share_copied),
        viewerOpens: toNumber(eventCounts.viewer_opened),
      },
    ),
  } as Record<string, AnalyticsMetricResult>;

  const metrics = ANALYTICS_SOCIAL_METRIC_DEFINITIONS.map((definition) => metricValues[definition.key]);
  const categories: AnalyticsMetricCategoryGroup[] = (["global", "user", "admin", "drop"] as AnalyticsMetricCategory[])
    .map((category) => ({
      key: category,
      label: ANALYTICS_METRIC_CATEGORY_LABELS[category],
      metrics: metrics.filter((metric) => metric.category === category),
    }));

  return {
    version: ANALYTICS_METRIC_CATALOG_VERSION,
    metrics,
    categories,
    overview: {
      total: metrics.length,
      healthy: metrics.filter((metric) => metric.status === "healthy").length,
      partial: metrics.filter((metric) => metric.status === "partial").length,
      empty: metrics.filter((metric) => metric.status === "empty").length,
    },
  };
}
