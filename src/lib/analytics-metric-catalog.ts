import {
  AnalyticsMetricCategory,
  AnalyticsMetricDefinition,
  AnalyticsMetricValueType,
} from "@/types/analytics";

export const ANALYTICS_METRIC_CATALOG_VERSION = "2026.03.16.1";

export const ANALYTICS_METRIC_CATEGORY_LABELS: Record<AnalyticsMetricCategory, string> = {
  global: "Global",
  user: "User",
  admin: "Admin",
  drop: "KandyDrop",
};

function defineMetric(input: AnalyticsMetricDefinition) {
  return input;
}

function metricSources(...sources: string[]) {
  return sources;
}

function metricFormula(value: string) {
  return value;
}

function metricReference(value: string) {
  return value;
}

function percentMetric(
  key: string,
  label: string,
  shortLabel: string,
  category: AnalyticsMetricCategory,
  description: string,
  formula: string,
  referenceModel: string,
  sources: string[],
  reliability: AnalyticsMetricDefinition["reliability"],
) {
  return defineMetric({
    key,
    label,
    shortLabel,
    category,
    valueType: "percent",
    reliability,
    description,
    formula: metricFormula(formula),
    referenceModel: metricReference(referenceModel),
    sources,
  });
}

function ratioMetric(
  key: string,
  label: string,
  shortLabel: string,
  category: AnalyticsMetricCategory,
  description: string,
  formula: string,
  referenceModel: string,
  sources: string[],
  reliability: AnalyticsMetricDefinition["reliability"],
) {
  return defineMetric({
    key,
    label,
    shortLabel,
    category,
    valueType: "ratio",
    reliability,
    description,
    formula: metricFormula(formula),
    referenceModel: metricReference(referenceModel),
    sources,
  });
}

export const ANALYTICS_SOCIAL_METRIC_DEFINITIONS: AnalyticsMetricDefinition[] = [
  ratioMetric(
    "view_frequency",
    "View frequency",
    "Frequency",
    "global",
    "Average number of tracked page views per reached session.",
    "page_views / reached_sessions",
    "Close to Meta's impressions-per-account style read on content frequency.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "multi_page_session_rate",
    "Multi-page session rate",
    "Multi-page",
    "global",
    "Share of sessions that visited more than one distinct page.",
    "sessions_with_2_plus_pages / reached_sessions",
    "Similar to measuring how often a visit expands beyond a single surface.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "fast_bounce_rate",
    "Fast bounce rate",
    "Fast bounce",
    "global",
    "Share of sessions that exited within a very short window without meaningful engagement.",
    "fast_bounce_sessions / reached_sessions",
    "Comparable to quick-exit or low-attention traffic quality checks.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "deep_scroll_session_rate",
    "Deep scroll session rate",
    "Deep scroll",
    "global",
    "Share of sessions that reached at least 75% scroll depth.",
    "deep_scroll_sessions / reached_sessions",
    "Comparable to feed depth or content depth consumption.",
    metricSources("analytics_guest_batches"),
    "directional",
  ),
  percentMetric(
    "returning_actor_rate",
    "Returning actor rate",
    "Returning",
    "global",
    "Share of tracked actors who returned for more than one distinct session in the selected range.",
    "actors_with_2_plus_sessions / tracked_actors",
    "Close to returning viewers or returning visitors on social dashboards.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "home_to_dashboard_transition_rate",
    "Home to dashboard transition rate",
    "Home to dash",
    "global",
    "Share of homepage sessions that continued into the signed-in dashboard.",
    "sessions_with_home_and_dashboard / homepage_sessions",
    "Comparable to landing-page to primary-product conversion.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  ratioMetric(
    "interaction_intensity",
    "Interaction intensity",
    "Intensity",
    "global",
    "Average number of clicks, hovers, and scroll checkpoints per reached session.",
    "(clicks + hovers + scrolls) / reached_sessions",
    "Close to interactions-per-reach style creator analytics.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "engaged_exit_rate",
    "Engaged exit rate",
    "Engaged exits",
    "global",
    "Share of exiting sessions that left after meaningful interaction rather than passive abandonment.",
    "engaged_exit_sessions / exiting_sessions",
    "Comparable to distinguishing quality exits from low-intent drop-offs.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "library_visit_rate",
    "Library visit rate",
    "Library rate",
    "user",
    "Share of user-surface sessions that reached the library.",
    "library_sessions / user_surface_sessions",
    "Close to profile or tab visit rates on creator products.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "experiences_visit_rate",
    "Experiences visit rate",
    "Experience rate",
    "user",
    "Share of user-surface sessions that reached the experiences hub.",
    "experiences_sessions / user_surface_sessions",
    "Comparable to destination-tab visit rates.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "profile_visit_rate",
    "Profile visit rate",
    "Profile rate",
    "user",
    "Share of user-surface sessions that opened profile settings.",
    "profile_sessions / user_surface_sessions",
    "Close to profile activity or profile visit rate.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "cross_surface_journey_rate",
    "Cross-surface journey rate",
    "Cross-surface",
    "user",
    "Share of user-surface sessions that touched two or more user destinations.",
    "sessions_with_2_plus_user_surfaces / user_surface_sessions",
    "Comparable to multi-surface journey depth across profile, feed, and content tabs.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "checkin_conversion_rate",
    "Check-in conversion rate",
    "Check-in rate",
    "user",
    "Share of dashboard sessions that converted into a daily check-in claim.",
    "daily_check_in_claims / dashboard_sessions",
    "Comparable to habit-loop conversion from core surface to repeat action.",
    metricSources("analytics_event_facts", "daily_task_events"),
    "canonical",
  ),
  percentMetric(
    "notification_opt_in_rate",
    "Notification opt-in rate",
    "Opt-in rate",
    "user",
    "Share of notification prompt views that converted into enabled notifications.",
    "notifications_enabled / notification_prompt_views",
    "Close to reminder opt-in conversion or notification consent rate.",
    metricSources("analytics_event_facts", "telemetry_logs"),
    "canonical",
  ),
  percentMetric(
    "task_guidance_completion_rate",
    "Task guidance completion rate",
    "Guide win rate",
    "user",
    "Share of guidance banner views that ended in a guided completion.",
    "task_guidance_completed / task_guidance_banner_viewed",
    "Comparable to guided action completion from an in-product education banner.",
    metricSources("analytics_event_facts", "telemetry_logs"),
    "canonical",
  ),
  percentMetric(
    "signup_to_onboarding_start_rate",
    "Signup to onboarding start rate",
    "Signup start",
    "user",
    "Share of new registrations that started guided onboarding.",
    "guided_onboarding_starts / user_registered",
    "Comparable to signup-to-first-activation rate.",
    metricSources("analytics_event_facts"),
    "canonical",
  ),
  percentMetric(
    "onboarding_step_completion_rate",
    "Onboarding step completion rate",
    "Step finish",
    "user",
    "Share of tracked onboarding steps that reached completion after starting.",
    "guided_onboarding_step_completed / guided_onboarding_step_started",
    "Comparable to onboarding funnel step completion quality.",
    metricSources("analytics_event_facts"),
    "canonical",
  ),
  percentMetric(
    "admin_multi_page_rate",
    "Admin multi-page rate",
    "Admin depth",
    "admin",
    "Share of admin sessions that visited more than one admin page.",
    "admin_sessions_with_2_plus_pages / admin_sessions",
    "Comparable to analyst workflow depth across admin tools.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "analytics_review_rate",
    "Analytics review rate",
    "Analytics review",
    "admin",
    "Share of admin sessions that opened the analytics workspace.",
    "admin_analytics_sessions / admin_sessions",
    "Comparable to how often operators land in reporting versus other tools.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "user_drilldown_rate",
    "User drilldown rate",
    "Drilldown",
    "admin",
    "Share of analytics-review sessions that continued into an admin user detail page.",
    "admin_user_detail_sessions / admin_analytics_sessions",
    "Comparable to report-to-investigation follow-through.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "admin_engaged_session_rate",
    "Admin engaged session rate",
    "Admin engaged",
    "admin",
    "Share of admin sessions that exited with meaningful interaction.",
    "engaged_admin_exits / admin_sessions",
    "Comparable to operator engagement quality for internal tools.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "admin_returning_actor_rate",
    "Admin returning actor rate",
    "Admin returning",
    "admin",
    "Share of admin actors who returned for multiple admin sessions in the selected range.",
    "admin_actors_with_2_plus_sessions / admin_actors",
    "Comparable to recurring analyst usage or dashboard habit strength.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "drop_catalog_reach_rate",
    "Drop catalog reach rate",
    "Catalog reach",
    "drop",
    "Share of tracked sessions that reached the drops catalog or a drop-view surface.",
    "drop_surface_sessions / reached_sessions",
    "Close to accounts reached for a content surface.",
    metricSources("analytics_event_facts", "analytics_guest_batches"),
    "cross_source",
  ),
  percentMetric(
    "preview_click_through_rate",
    "Preview click-through rate",
    "Preview CTR",
    "drop",
    "Share of drop card impressions that converted into a preview open.",
    "drop_preview_opened / drop_card_impression",
    "Comparable to post click-through rate from an impression.",
    metricSources("analytics_event_facts", "ga4"),
    "cross_source",
  ),
  percentMetric(
    "preview_to_unlock_rate",
    "Preview to unlock rate",
    "Preview unlock",
    "drop",
    "Share of preview opens that converted into a successful unlock.",
    "unlock_drop_success / drop_preview_opened",
    "Comparable to content-interest to conversion rate.",
    metricSources("analytics_event_facts", "transactions"),
    "canonical",
  ),
  percentMetric(
    "unlock_to_viewer_rate",
    "Unlock to viewer rate",
    "Unlock open",
    "drop",
    "Share of successful unlocks that continued into the viewer.",
    "viewer_opened / unlock_drop_success",
    "Comparable to purchase-to-consumption continuation.",
    metricSources("analytics_event_facts", "analytics_watch_sessions", "analytics_session_facts"),
    "cross_source",
  ),
  percentMetric(
    "viewer_completion_rate",
    "Viewer completion rate",
    "Viewer finish",
    "drop",
    "Share of viewer sessions that reached a completed state.",
    "viewer_sessions_completed / viewer_sessions_started",
    "Comparable to video completion rate.",
    metricSources("analytics_watch_sessions", "analytics_session_facts", "analytics_event_facts"),
    "canonical",
  ),
  percentMetric(
    "high_watch_depth_rate",
    "High watch depth rate",
    "High watch",
    "drop",
    "Share of viewer sessions that accumulated at least 60 seconds of watch time.",
    "viewer_sessions_with_60_plus_watch_seconds / viewer_sessions_started",
    "Comparable to strong watch-time retention on short-form media.",
    metricSources("analytics_watch_sessions", "analytics_session_facts"),
    "canonical",
  ),
  percentMetric(
    "repeat_viewer_rate",
    "Repeat viewer rate",
    "Repeat viewers",
    "drop",
    "Share of tracked viewer actors who started more than one viewer session in the selected range.",
    "viewer_actors_with_2_plus_sessions / viewer_actors",
    "Comparable to returning viewers for a creator or reel.",
    metricSources("analytics_watch_sessions", "analytics_session_facts", "analytics_event_facts"),
    "canonical",
  ),
  percentMetric(
    "drop_share_rate",
    "Drop share rate",
    "Share rate",
    "drop",
    "Share of viewer opens that led to a share-copy action.",
    "drop_share_copied / viewer_opened",
    "Comparable to shares per view on creator content.",
    metricSources("analytics_event_facts", "ga4"),
    "cross_source",
  ),
];

export const ANALYTICS_SOCIAL_METRICS_BY_KEY = Object.fromEntries(
  ANALYTICS_SOCIAL_METRIC_DEFINITIONS.map((metric) => [metric.key, metric]),
) as Record<string, AnalyticsMetricDefinition>;

export function formatAnalyticsMetricValue(value: number, valueType: AnalyticsMetricValueType) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (valueType === "percent") {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
  }

  if (valueType === "seconds") {
    return `${Math.round(value).toLocaleString()}s`;
  }

  if (valueType === "ratio") {
    return value.toFixed(value >= 10 ? 1 : 2);
  }

  return Math.round(value).toLocaleString();
}
