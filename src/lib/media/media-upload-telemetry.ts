import {
  buildEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import type {
  CanonicalEventEnvelope,
} from "@/lib/analytics/event-envelope-contract";
import {
  buildMediaUploadLifecycleEvent,
  MEDIA_UPLOAD_LIFECYCLE_EVENTS,
  type MediaUploadLifecycleEventName,
  type MediaUploadLifecycleInput,
  type MediaUploadLifecyclePayload,
} from "./media-upload-contract";

export const MEDIA_UPLOAD_TELEMETRY_DEBUG_LANE = "Media upload";

export function listMediaUploadTelemetryEvents(): MediaUploadLifecycleEventName[] {
  return [...MEDIA_UPLOAD_LIFECYCLE_EVENTS];
}

export function buildMediaUploadTelemetryPayload(input: MediaUploadLifecycleInput): MediaUploadLifecyclePayload {
  return buildMediaUploadLifecycleEvent(input);
}

export function buildMediaUploadTelemetryEnvelope(input: MediaUploadLifecycleInput & {
  sessionId?: string | null;
  source?: "client" | "server" | "system";
}): CanonicalEventEnvelope {
  const payload = buildMediaUploadTelemetryPayload(input);
  return buildEventEnvelope({
    eventId: `${payload.eventName}:${payload.correlationId}`,
    eventName: payload.eventName,
    timestamp: new Date().toISOString(),
    featureId: "analytics_telemetry",
    surface: payload.surface,
    actorKind: payload.ownerUserId ? "signed_in_user" : "system",
    identityState: payload.ownerUserId ? "logged_in_unlinked" : "legacy_unknown",
    identityConfidence: payload.ownerUserId ? "exact" : "unknown",
    userId: payload.ownerUserId,
    sessionId: input.sessionId ?? payload.correlationId,
    consentMode: "minimal_analytics",
    source: input.source ?? "client",
    privacyClass: payload.privacyClass === "admin_debug" ? "admin_debug" : "required_integrity",
    metadata: {
      uploadId: payload.uploadId,
      correlationId: payload.correlationId,
      ownerUserId: payload.ownerUserId,
      mediaKind: payload.mediaKind,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      maxBytes: payload.maxBytes,
      storagePathFingerprint: payload.storagePathFingerprint,
      status: payload.status,
      failureReason: payload.failureReason,
      durationMs: payload.durationMs,
      retryCount: payload.retryCount,
      debugLane: MEDIA_UPLOAD_TELEMETRY_DEBUG_LANE,
      assetUrlLogging: payload.assetUrlPolicy === "none" ? "none" : "redacted",
    },
  });
}

export function buildMediaUploadTrackEventPayload(input: MediaUploadLifecycleInput): Record<string, string | number | boolean | null> {
  const payload = buildMediaUploadTelemetryPayload(input);
  return {
    contract_version: payload.contractVersion,
    upload_id: payload.uploadId,
    correlation_id: payload.correlationId,
    owner_user_id: payload.ownerUserId,
    feature_id: payload.featureId,
    surface: payload.surface,
    media_kind: payload.mediaKind,
    mime_type: payload.mimeType,
    size_bytes: payload.sizeBytes,
    max_bytes: payload.maxBytes,
    storage_path_fingerprint: payload.storagePathFingerprint,
    asset_url_logging: payload.assetUrlPolicy === "none" ? "none" : "redacted",
    status: payload.status,
    failure_reason: payload.failureReason,
    duration_ms: payload.durationMs,
    retry_count: payload.retryCount,
    privacy_class: payload.privacyClass,
    debug_lane: MEDIA_UPLOAD_TELEMETRY_DEBUG_LANE,
  };
}
