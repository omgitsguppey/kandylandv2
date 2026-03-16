import {
  getTelemetryEventOption,
  TELEMETRY_EVENT_INDEX_VERSION,
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
  const { canonicalEventName, option } = getTelemetryEventOption(rawEventName);
  const isKnownEvent = TELEMETRY_EVENT_NAME_SET.has(canonicalEventName);

  const normalizedParams: AnalyticsEventParams = {};
  Object.entries(eventParams ?? {}).forEach(([key, value]) => {
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
    event_index_version: TELEMETRY_EVENT_INDEX_VERSION,
    tracking_origin: "client",
  };

  if (rawEventName !== canonicalEventName) {
    enrichedParams.legacy_event_name = rawEventName;
  }

  if (option?.category) {
    enrichedParams.event_category = option.category;
  }

  if (option?.modules?.length) {
    enrichedParams.event_modules = option.modules.join("|");
  }

  if (option?.sources?.length) {
    enrichedParams.tracking_sources = option.sources.join("|");
  }

  return {
    canonicalEventName,
    isKnownEvent,
    enrichedParams,
  };
}
