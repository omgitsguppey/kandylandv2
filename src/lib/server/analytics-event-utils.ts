import "server-only";

import {
  buildTelemetryEventMetadata,
  TELEMETRY_EVENT_NAME_SET,
} from "@/lib/telemetry-catalog";

export function buildAnalyticsTimeKeys(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return {
    dayKey: `${year}-${month}-${day}`,
    hourKey: `${year}-${month}-${day}T${hour}`,
    minuteKey: `${year}-${month}-${day}T${hour}:${minute}`,
  };
}

export function resolveTrackedTelemetryEvent(rawEventName: string) {
  const { canonicalEventName, option, metadataParams } = buildTelemetryEventMetadata(rawEventName);

  return {
    canonicalEventName,
    option,
    metadataParams,
    isKnownEvent: TELEMETRY_EVENT_NAME_SET.has(canonicalEventName),
  };
}
