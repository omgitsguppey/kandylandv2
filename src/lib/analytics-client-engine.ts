import {
  buildTelemetryEventMetadata,
  normalizeTelemetryEventPayloadParams,
  TELEMETRY_EVENT_NAME_SET,
} from "./telemetry-catalog";

type AnalyticsScalar = string | number | boolean;

export type AnalyticsEventParams = Record<string, AnalyticsScalar>;

export interface PreparedAnalyticsEvent {
  canonicalEventName: string;
  isKnownEvent: boolean;
  enrichedParams: AnalyticsEventParams;
}

export function prepareAnalyticsEvent(
  rawEventName: string,
  eventParams?: Record<string, unknown>,
): PreparedAnalyticsEvent {
  const { canonicalEventName, metadataParams } = buildTelemetryEventMetadata(rawEventName);
  const isKnownEvent = TELEMETRY_EVENT_NAME_SET.has(canonicalEventName);
  const aliasedParams = normalizeTelemetryEventPayloadParams(eventParams);

  const normalizedParams: AnalyticsEventParams = {};
  Object.entries(aliasedParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalizedParams[key] = value;
      return;
    }

    if (value === null || typeof value === "undefined") {
      return;
    }

    normalizedParams[key] = JSON.stringify(value);
  });

  const enrichedParams: AnalyticsEventParams = {
    ...normalizedParams,
    ...metadataParams,
    tracking_origin: "client",
  };

  return {
    canonicalEventName,
    isKnownEvent,
    enrichedParams,
  };
}
