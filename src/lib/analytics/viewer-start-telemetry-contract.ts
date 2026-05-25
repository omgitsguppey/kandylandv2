export const CANONICAL_VIEWER_START_EVENT_NAME = "watch_session_started" as const;

export interface ViewerStartTelemetryInput {
  userId?: string | null;
  guestId?: string | null;
  dropId: string;
  watchSessionId: string;
  clientSessionId: string;
  entitlementState: "unlocked" | "owned" | "subscription_included";
  mediaKind?: string | null;
  route: string;
  sourceComponent: string;
  consentState?: string | null;
}

function requireString(value: string, field: string) {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${field} is required for viewer start telemetry.`);
  return cleaned;
}

function sanitizeIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 96);
}

export function buildViewerStartTelemetryEvent(input: ViewerStartTelemetryInput) {
  const dropId = requireString(input.dropId, "dropId");
  const watchSessionId = requireString(input.watchSessionId, "watchSessionId");
  const clientSessionId = requireString(input.clientSessionId, "clientSessionId");
  const eventId = `${CANONICAL_VIEWER_START_EVENT_NAME}:${sanitizeIdPart(watchSessionId)}:${sanitizeIdPart(dropId)}`;

  return {
    eventName: CANONICAL_VIEWER_START_EVENT_NAME,
    eventId,
    idempotencyKey: eventId,
    userId: input.userId || "",
    params: {
      event_id: eventId,
      eventId,
      idempotency_key: eventId,
      idempotencyKey: eventId,
      drop_id: dropId,
      dropId,
      watch_session_id: watchSessionId,
      watchSessionId,
      viewer_session_id: watchSessionId,
      viewerSessionId: watchSessionId,
      client_session_id: clientSessionId,
      clientSessionId,
      entitlement_state: input.entitlementState,
      entitlementState: input.entitlementState,
      media_kind: input.mediaKind || "unknown",
      mediaKind: input.mediaKind || "unknown",
      route: input.route,
      page_path: input.route,
      source_component: input.sourceComponent,
      sourceTruth: "server_viewer_start",
      source_truth: "server_viewer_start",
      consent_state: input.consentState || "unknown",
      ...(input.userId ? { user_id: input.userId, userId: input.userId } : {}),
      ...(input.guestId ? { guest_id: input.guestId, guestId: input.guestId } : {}),
    },
  };
}

export function classifyViewerStartCoverage(input: {
  watchSessionCount: number;
  sessionFactCount: number;
  viewerStartEventCount: number;
}) {
  const watchSessionCount = Math.max(0, Math.round(input.watchSessionCount));
  const sessionFactCount = Math.max(0, Math.round(input.sessionFactCount));
  const viewerStartEventCount = Math.max(0, Math.round(input.viewerStartEventCount));
  const startRequired = watchSessionCount > 0 || sessionFactCount > 0;
  const missing = startRequired && viewerStartEventCount <= 0;

  return {
    state: !startRequired ? "review" as const : missing ? "fail" as const : "pass" as const,
    passAllowed: startRequired && !missing,
    rawStartRequired: true,
    attributionGap: missing ? "viewer_start_missing" as const : "none" as const,
    nextAction: missing
      ? "Wire viewer start telemetry when unlocked content viewer exposure begins; do not emit on skeletons or locked previews."
      : "No action required.",
  };
}
