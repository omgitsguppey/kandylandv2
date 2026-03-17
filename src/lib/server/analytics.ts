import "server-only";

import { adminDb } from "./firebase-admin";
import { recordTelemetryEventStat } from "./daily-tasks";
import { recordSemanticRollupFromTelemetryEvent } from "./analytics-semantics";
import { buildAnalyticsSemanticParams } from "@/lib/analytics-semantics";
import {
  buildTelemetryEventMetadata,
} from "@/lib/telemetry-catalog";

function buildTimeKeys(timestamp: number) {
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

function sanitizeServerParams(params: Record<string, unknown>) {
  const sanitized: Record<string, string | number | boolean> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
      return;
    }

    if (value === null || typeof value === "undefined") {
      return;
    }

    sanitized[key] = JSON.stringify(value);
  });

  return sanitized;
}

function readStringParam(params: Record<string, string | number | boolean>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "";
}

function readNumberParam(params: Record<string, string | number | boolean>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

export async function trackServerEvent(
  rawEventName: string,
  params: Record<string, unknown>,
  userId?: string,
) {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;
  const nowMs = Date.now();
  const { canonicalEventName, option, metadataParams } = buildTelemetryEventMetadata(rawEventName);
  const sanitizedParams = sanitizeServerParams(params);
  const enrichedParams = {
    ...sanitizedParams,
    ...metadataParams,
    tracking_origin: "server",
    ...buildAnalyticsSemanticParams({
      pagePath: readStringParam(sanitizedParams, "page_path", "pagePath"),
      dropId: readStringParam(sanitizedParams, "drop_id", "dropId"),
      dropCategory: readStringParam(sanitizedParams, "drop_category", "dropCategory"),
    }),
  };

  try {
    const timeKeys = buildTimeKeys(nowMs);
    await Promise.all([
      adminDb.collection("analytics_event_facts").add({
        source: userId ? "authenticated_server" : "server",
        consentMode: userId ? "identified" : "server",
        eventName: canonicalEventName,
        userId: userId || "",
        username: "",
        timestamp: nowMs,
        userAgent: "server",
        pagePath: readStringParam(enrichedParams, "page_path", "pagePath"),
        sessionId: readStringParam(enrichedParams, "session_id", "sessionId"),
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        minuteKey: timeKeys.minuteKey,
        dropId: readStringParam(enrichedParams, "drop_id", "dropId"),
        dropTitle: readStringParam(enrichedParams, "drop_title", "dropTitle"),
        dropCategory: readStringParam(enrichedParams, "drop_category", "dropCategory"),
        assetKey: readStringParam(enrichedParams, "asset_key", "assetKey"),
        assetIndex: readNumberParam(enrichedParams, "asset_index", "assetIndex"),
        contentKind: readStringParam(enrichedParams, "content_kind", "contentKind"),
        destination: readStringParam(enrichedParams, "destination"),
        destinationType: readStringParam(enrichedParams, "destination_type", "destinationType"),
        sessionWatchSeconds: readNumberParam(enrichedParams, "session_watch_seconds", "sessionWatchSeconds"),
        watchSeconds: readNumberParam(enrichedParams, "watch_seconds", "watchSeconds"),
        durationMs: readNumberParam(enrichedParams, "duration_ms", "durationMs"),
        loadMs: readNumberParam(enrichedParams, "load_ms", "loadMs"),
        viewportWidth: undefined,
        viewportHeight: undefined,
        isMobileViewport: undefined,
        authState: userId ? "authenticated" : "server",
        semanticCategory: readStringParam(enrichedParams, "semantic_category"),
        semanticCategoryLabel: readStringParam(enrichedParams, "semantic_category_label"),
        semanticScopeKey: readStringParam(enrichedParams, "semantic_scope_key"),
        semanticScopeLabel: readStringParam(enrichedParams, "semantic_scope_label"),
        semanticSurfaceKey: readStringParam(enrichedParams, "semantic_surface_key"),
        semanticSurfaceLabel: readStringParam(enrichedParams, "semantic_surface_label"),
        eventCategory: option?.category || "system",
        eventModules: option?.modules || [],
        trackingSources: option?.sources || [],
        eventIndexVersion: readStringParam(enrichedParams, "event_index_version"),
        trackingOrigin: "server",
        params: enrichedParams,
        createdAt: nowMs,
      }),
      recordTelemetryEventStat(canonicalEventName, enrichedParams),
      recordSemanticRollupFromTelemetryEvent({
        timestamp: nowMs,
        eventName: canonicalEventName,
        params: enrichedParams,
        sourceKey: "server",
      }),
    ]);
  } catch (error) {
    console.error("Failed to mirror server event into analytics facts:", error);
  }

  if (!measurementId || !apiSecret) {
    return;
  }

  try {
    const payload = {
      client_id: userId || "anonymous-server-client",
      ...(userId ? { user_id: userId } : {}),
      events: [
        {
          name: canonicalEventName,
          params: {
            ...enrichedParams,
            timestamp_micros: nowMs * 1000,
          },
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      console.error("Failed to send GA server event", await response.text());
    }
  } catch (error) {
    console.error("GA server tracking error:", error);
  }
}
