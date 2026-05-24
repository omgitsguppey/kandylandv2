import { buildEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import type {
  NotificationPermissionState,
} from "@/lib/notifications/notification-permission-contract";
import type {
  PushTokenLifecycleEvent,
  PushTokenScope,
  PushTokenStatus,
} from "@/lib/notifications/push-token-contract";

export type PushTokenTelemetryPayload = {
  eventName: PushTokenLifecycleEvent;
  tokenStatus: PushTokenStatus;
  tokenScope: PushTokenScope;
  permissionState: NotificationPermissionState;
  deviceId: string;
  browser: string;
  platform: string;
  standalone: boolean;
  tokenFingerprint?: string | null;
  tokenRedacted?: string | null;
  failureReason?: string | null;
  route: string;
  sourceComponent: string;
};

export type PushTokenTrackDispatch = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => void;

export function buildPushTokenTelemetryPayload(payload: PushTokenTelemetryPayload): PushTokenTelemetryPayload {
  return {
    ...payload,
    deviceId: payload.deviceId.slice(0, 96),
    browser: payload.browser.slice(0, 80),
    platform: payload.platform.slice(0, 80),
    tokenFingerprint: payload.tokenFingerprint ?? null,
    tokenRedacted: payload.tokenRedacted ?? null,
    failureReason: payload.failureReason ?? null,
  };
}

export function buildPushTokenTelemetryEnvelope(payload: PushTokenTelemetryPayload): CanonicalEventEnvelope {
  const safePayload = buildPushTokenTelemetryPayload(payload);

  return buildEventEnvelope({
    eventName: safePayload.eventName,
    timestamp: Date.now(),
    source: safePayload.sourceComponent === "push-token-route" ? "server" : "client",
    featureId: "notifications",
    surface: "push_token_registration",
    materializerLane: "notification_materializer",
    debugVisibility: "debug_visible",
    scoreImpact: "evidenceCompleteness.runtimeHealth",
    metadata: {
      tokenStatus: safePayload.tokenStatus,
      tokenScope: safePayload.tokenScope,
      permissionState: safePayload.permissionState,
      deviceId: safePayload.deviceId,
      browser: safePayload.browser,
      platform: safePayload.platform,
      standalone: safePayload.standalone,
      pushCredentialFingerprint: safePayload.tokenFingerprint ?? "",
      pushCredentialRedacted: safePayload.tokenRedacted ?? "",
      failureReason: safePayload.failureReason ?? "",
      route: safePayload.route,
      sourceComponent: safePayload.sourceComponent,
    },
  });
}

export function trackPushTokenLifecycleEvent(
  payload: PushTokenTelemetryPayload,
  dispatch: PushTokenTrackDispatch,
): CanonicalEventEnvelope {
  const envelope = buildPushTokenTelemetryEnvelope(payload);

  dispatch(envelope.eventName, {
    ...envelope.metadata,
    feature_id: envelope.featureId,
    materializer_lane: envelope.materializerLane,
    debug_visibility: envelope.debugVisibility,
    score_impact: envelope.scoreImpact,
    event_envelope_pipeline_status: envelope.pipelineStatus,
  });

  return envelope;
}
