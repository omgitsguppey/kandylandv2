import "server-only";

import { buildAnalyticsTimeKeys } from "@/lib/analytics-time";
import {
  buildTelemetryEventMetadata,
  TELEMETRY_EVENT_NAME_SET,
} from "@/lib/telemetry-catalog";

export { buildAnalyticsTimeKeys };

export function resolveTrackedTelemetryEvent(rawEventName: string) {
  const { canonicalEventName, option, metadataParams } = buildTelemetryEventMetadata(rawEventName);

  return {
    canonicalEventName,
    option,
    metadataParams,
    isKnownEvent: TELEMETRY_EVENT_NAME_SET.has(canonicalEventName),
  };
}
