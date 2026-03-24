import "server-only";

import {
  buildDurationBuckets,
  getTelemetryParamNumber,
  TelemetryLogRecord,
  timestampToDayKey,
} from "./admin-analytics-shared";

export interface HistoricalEngagementAnalytics {
  authBreakdown: Array<{
    method: string;
    attempts: number;
    successes: number;
    failures: number;
    avgDurationMs: number;
    successRate: number;
  }>;
  onboardingDurationBuckets: Array<{ label: string; count: number }>;
  repeatVisitSegments: Array<{ label: string; users: number }>;
  destinationMix: Array<{ destination: string; count: number }>;
  notificationFunnel: Array<{ label: string; count: number }>;
  notificationActions: Array<{ label: string; value: number }>;
}

function averageDuration(records: TelemetryLogRecord[]) {
  const durations = records
    .map((record) => getTelemetryParamNumber(record, "duration_ms"))
    .filter((value) => value > 0);

  if (durations.length === 0) {
    return 0;
  }

  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export function buildHistoricalEngagementAnalytics(input: {
  telemetryLogs: TelemetryLogRecord[];
  telemetryLogsByEvent: Record<string, TelemetryLogRecord[]>;
  eventsData: Record<string, number>;
  onboardingDurationMsSamples: number[];
  emailRegistrationCount: number;
  canonicalRegistrationCount: number;
}) : HistoricalEngagementAnalytics {
  const normalizedEmailSignUpCount = input.emailRegistrationCount > 0
    ? input.emailRegistrationCount
    : input.eventsData.auth_sign_up_success || 0;
  const normalizedSignupCount = input.canonicalRegistrationCount > 0
    ? input.canonicalRegistrationCount
    : input.eventsData.auth_sign_up_success || 0;

  const authBreakdown = [
    {
      method: "Email sign in",
      attempts: input.eventsData.auth_sign_in_attempted || 0,
      successes: input.eventsData.auth_sign_in_success || 0,
      failures: input.eventsData.auth_sign_in_failed || 0,
      avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_in_success || []),
    },
    {
      method: "Email sign up",
      attempts: input.eventsData.auth_sign_up_attempted || 0,
      successes: normalizedEmailSignUpCount,
      failures: input.eventsData.auth_sign_up_failed || 0,
      avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_sign_up_success || []),
    },
    {
      method: "Google sign in",
      attempts: input.eventsData.auth_google_sign_in_attempted || 0,
      successes: input.eventsData.auth_google_sign_in_success || 0,
      failures: input.eventsData.auth_google_sign_in_failed || 0,
      avgDurationMs: averageDuration(input.telemetryLogsByEvent.auth_google_sign_in_success || []),
    },
    {
      method: "Registered users",
      attempts: normalizedSignupCount,
      successes: normalizedSignupCount,
      failures: 0,
      avgDurationMs: 0,
    },
  ].map((entry) => ({
    ...entry,
    successRate: entry.attempts > 0 ? entry.successes / entry.attempts : 0,
  }));

  const onboardingDurationsMs = [
    ...(input.onboardingDurationMsSamples.length > 0
      ? input.onboardingDurationMsSamples
      : (input.telemetryLogsByEvent.guided_onboarding_completed || []).map((record) => {
        const directMs = getTelemetryParamNumber(record, "duration_ms");
        if (directMs > 0) {
          return directMs;
        }

        return getTelemetryParamNumber(record, "durationSeconds") * 1000;
      })),
  ].filter((value) => value > 0);

  const onboardingDurationBuckets = buildDurationBuckets(onboardingDurationsMs, [
    { label: "<30s", max: 30_000 },
    { label: "30-60s", max: 60_000 },
    { label: "1-2m", max: 120_000 },
    { label: "2-5m", max: 300_000 },
    { label: "5m+", max: Number.POSITIVE_INFINITY },
  ]);

  const activeDaysByUser = new Map<string, Set<string>>();
  input.telemetryLogs.forEach((record) => {
    if (!record.userId) {
      return;
    }

    const dayKey = timestampToDayKey(record.timestamp);
    if (!activeDaysByUser.has(record.userId)) {
      activeDaysByUser.set(record.userId, new Set());
    }
    activeDaysByUser.get(record.userId)?.add(dayKey);
  });
  const activeDayCounts = Array.from(activeDaysByUser.values()).map((days) => days.size);
  const repeatVisitSegments = [
    { label: "1 day", users: activeDayCounts.filter((count) => count === 1).length },
    { label: "2 days", users: activeDayCounts.filter((count) => count === 2).length },
    { label: "3-4 days", users: activeDayCounts.filter((count) => count >= 3 && count <= 4).length },
    { label: "5+ days", users: activeDayCounts.filter((count) => count >= 5).length },
  ];

  const destinationMap = new Map<string, number>();
  (input.telemetryLogsByEvent.navigation_click || []).forEach((record) => {
    const destination = (record.params.destination as string) || "/";
    destinationMap.set(destination, (destinationMap.get(destination) || 0) + 1);
  });

  return {
    authBreakdown,
    onboardingDurationBuckets,
    repeatVisitSegments,
    destinationMix: Array.from(destinationMap.entries())
      .map(([destination, count]) => ({ destination, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
    notificationFunnel: [
      { label: "Prompt views", count: input.eventsData.notification_prompt_banner_viewed || 0 },
      { label: "Prompt dismissals", count: input.eventsData.notification_prompt_banner_dismissed || 0 },
      { label: "Notifications enabled", count: input.eventsData.task_notifications_enabled || 0 },
      { label: "Dropdown opens", count: input.eventsData.notifications_dropdown_opened || 0 },
      { label: "Notifications opened", count: input.eventsData.notification_opened || 0 },
      { label: "Marked read", count: input.eventsData.notification_marked_read || 0 },
    ],
    notificationActions: [
      { label: "Dropdown", value: input.eventsData.notifications_dropdown_opened || 0 },
      { label: "Open", value: input.eventsData.notification_opened || 0 },
      { label: "Read", value: input.eventsData.notification_marked_read || 0 },
      { label: "Clear all", value: input.eventsData.notification_mark_all_read || 0 },
      { label: "Enable", value: input.eventsData.task_notifications_enabled || 0 },
    ],
  };
}
