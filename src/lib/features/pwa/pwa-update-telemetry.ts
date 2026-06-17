import { buildEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import type {
  PwaMobileSafeAreaImpact,
  PwaNotificationCompatibility,
  PwaOfflineSupportStatus,
  PwaServiceWorkerRegistrationStatus,
  PwaServiceWorkerStatus,
  PwaServiceWorkerTelemetryEvent,
  PwaUpdateStatus,
} from "@/lib/features/pwa/pwa-service-worker-contract";

export type PwaUpdateTelemetryPayload = {
  eventName: PwaServiceWorkerTelemetryEvent;
  serviceWorkerStatus: PwaServiceWorkerStatus;
  registrationStatus: PwaServiceWorkerRegistrationStatus;
  updateStatus: PwaUpdateStatus;
  offlineSupportStatus: PwaOfflineSupportStatus;
  notificationCompatibility: PwaNotificationCompatibility;
  standaloneMode: string;
  mobileSafeAreaImpact: PwaMobileSafeAreaImpact;
  route: string;
  sourceComponent: string;
  failureReason?: string | null;
};

export type PwaTelemetryDispatch = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => void;

export function buildPwaUpdateTelemetryEnvelope(payload: PwaUpdateTelemetryPayload): CanonicalEventEnvelope {
  return buildEventEnvelope({
    eventName: payload.eventName,
    timestamp: Date.now(),
    source: "client",
    featureId: "notifications",
    surface: "pwa_service_worker",
    materializerLane: "notification_materializer",
    debugVisibility: "debug_visible",
    scoreImpact: "runtimeHealth.evidenceCompleteness.freshness",
    metadata: {
      serviceWorkerStatus: payload.serviceWorkerStatus,
      registrationStatus: payload.registrationStatus,
      updateStatus: payload.updateStatus,
      offlineSupportStatus: payload.offlineSupportStatus,
      notificationCompatibility: payload.notificationCompatibility,
      standaloneMode: payload.standaloneMode,
      mobileSafeAreaImpact: payload.mobileSafeAreaImpact,
      route: payload.route,
      sourceComponent: payload.sourceComponent,
      failureReason: payload.failureReason ?? "",
    },
  });
}

export function trackPwaServiceWorkerEvent(
  payload: PwaUpdateTelemetryPayload,
  dispatch: PwaTelemetryDispatch,
): CanonicalEventEnvelope {
  const envelope = buildPwaUpdateTelemetryEnvelope(payload);

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
