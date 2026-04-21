import "server-only";

import * as admin from "firebase-admin";

import { adminDb } from "./firebase-admin";
import { buildAnalyticsTimeKeys, resolveTrackedTelemetryEvent } from "./analytics-event-utils";
import { recordRouteWarning } from "./route-diagnostics";
import { buildAnalyticsSemanticParams } from "@/lib/analytics-semantics";
import { profileAllowsIdentifiedAnalytics } from "@/lib/server/privacy-consent";
import type { UserProfile } from "@/types/db";

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

async function userAllowsServerAnalytics(userId?: string) {
  if (!userId || !adminDb) {
    return true;
  }

  try {
    const snapshot = await adminDb.collection("users").doc(userId).get();
    const profile = snapshot.exists ? snapshot.data() as UserProfile : null;
    return profileAllowsIdentifiedAnalytics(profile);
  } catch (error) {
    recordRouteWarning("server/analytics", "Failed to resolve privacy settings for server event", error, {
      channel: "analytics",
      detail: { userId },
    });
    return false;
  }
}

export async function trackServerEvent(
  rawEventName: string,
  params: Record<string, unknown>,
  userId?: string,
) {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;
  const nowMs = Date.now();
  const { canonicalEventName, option, metadataParams, isKnownEvent } = resolveTrackedTelemetryEvent(rawEventName);
  if (!isKnownEvent) {
    console.warn(`[Analytics] Ignored unsupported server event: ${rawEventName}`);
    return;
  }
  if (!(await userAllowsServerAnalytics(userId))) {
    return;
  }
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
    const timeKeys = buildAnalyticsTimeKeys(nowMs);
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ]);
  } catch (error) {
    recordRouteWarning("server/analytics", "Failed to mirror server event into analytics facts", error, {
      channel: "analytics",
      detail: {
        rawEventName,
        canonicalEventName,
        userId: userId || "",
      },
    });
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
      const responseText = await response.text();
      recordRouteWarning("server/analytics", "Failed to send GA server event", undefined, {
        channel: "analytics",
        detail: {
          rawEventName,
          canonicalEventName,
          userId: userId || "",
          status: response.status,
          responseText,
        },
      });
    }
  } catch (error) {
    recordRouteWarning("server/analytics", "GA server tracking error", error, {
      channel: "analytics",
      detail: {
        rawEventName,
        canonicalEventName,
        userId: userId || "",
      },
    });
  }
}
