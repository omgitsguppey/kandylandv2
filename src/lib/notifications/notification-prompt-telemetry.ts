import {
  buildEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import type {
  CanonicalEventEnvelope,
} from "@/lib/analytics/event-envelope-contract";
import type {
  NotificationPermissionState,
  NotificationPromptFeatureSource,
  NotificationPromptLifecycleEvent,
  NotificationPromptStatus,
  NotificationPromptUserScope,
} from "@/lib/notifications/notification-permission-contract";

export type NotificationPromptTelemetryPayload = {
  eventName: NotificationPromptLifecycleEvent;
  permissionState: NotificationPermissionState;
  promptStatus: NotificationPromptStatus;
  userScope: NotificationPromptUserScope;
  featureSource: NotificationPromptFeatureSource;
  sourceComponent: "NotificationPromptBanner" | string;
  route: string;
  cooldownRemainingMs: number;
  retryCount: number;
  blockedReason?: string | null;
  failureReason?: string | null;
  requiresPwaInstall?: boolean;
  messagingSupported?: boolean;
};

export type NotificationPromptTrackDispatch = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => void;

export function buildNotificationPromptTelemetryPayload(
  payload: NotificationPromptTelemetryPayload,
): NotificationPromptTelemetryPayload {
  return {
    ...payload,
    cooldownRemainingMs: Math.max(0, Math.floor(payload.cooldownRemainingMs)),
    retryCount: Math.max(0, Math.floor(payload.retryCount)),
    blockedReason: payload.blockedReason ?? null,
    failureReason: payload.failureReason ?? null,
    requiresPwaInstall: payload.requiresPwaInstall === true,
    messagingSupported: payload.messagingSupported === true,
  };
}

export function buildNotificationPromptTelemetryEnvelope(
  payload: NotificationPromptTelemetryPayload,
): CanonicalEventEnvelope {
  const safePayload = buildNotificationPromptTelemetryPayload(payload);

  return buildEventEnvelope({
    eventName: safePayload.eventName,
    timestamp: Date.now(),
    source: "client",
    featureId: "notifications",
    surface: "notification_permission_prompt",
    materializerLane: "notification_materializer",
    debugVisibility: "debug_visible",
    scoreImpact: "evidenceCompleteness.runtimeHealth",
    metadata: {
      permissionState: safePayload.permissionState,
      promptStatus: safePayload.promptStatus,
      userScope: safePayload.userScope,
      featureSource: safePayload.featureSource,
      sourceComponent: safePayload.sourceComponent,
      route: safePayload.route,
      cooldownRemainingMs: safePayload.cooldownRemainingMs,
      retryCount: safePayload.retryCount,
      blockedReason: safePayload.blockedReason ?? "",
      failureReason: safePayload.failureReason ?? "",
      requiresPwaInstall: safePayload.requiresPwaInstall === true,
      messagingSupported: safePayload.messagingSupported === true,
    },
  });
}

export function trackNotificationPromptLifecycleEvent(
  payload: NotificationPromptTelemetryPayload,
  dispatch: NotificationPromptTrackDispatch,
): CanonicalEventEnvelope {
  const envelope = buildNotificationPromptTelemetryEnvelope(payload);

  dispatch(envelope.eventName, {
    ...envelope.metadata,
    feature_id: envelope.featureId,
    materializer_lane: envelope.materializerLane,
    debug_visibility: envelope.debugVisibility,
    score_impact: envelope.scoreImpact,
    event_envelope_pipeline_status: envelope.pipelineStatus,
    source_component: payload.sourceComponent,
    route: payload.route,
  });

  return envelope;
}
