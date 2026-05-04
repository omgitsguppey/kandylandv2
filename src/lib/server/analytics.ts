import "server-only";

import * as admin from "firebase-admin";

import { adminDb } from "./firebase-admin";
import { buildAnalyticsTimeKeys, resolveTrackedTelemetryEvent } from "./analytics-event-utils";
import { recordRouteWarning } from "./route-diagnostics";
import { buildAnalyticsSemanticParams } from "@/lib/analytics-semantics";
import { explainEventInclusion } from "@/lib/analytics/analytics-event-contract";
import { BEHAVIORAL_EVENT_FACT_VERSION } from "@/lib/behavioral/event-fact-contract";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
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

function readNullableNumberParam(params: Record<string, string | number | boolean>, ...keys: string[]) {
  return readNumberParam(params, ...keys) ?? null;
}

function buildServerEventId(userId: string | undefined, eventName: string) {
  const randomFragment = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `srv_${(userId || "server").slice(0, 24)}_${eventName.slice(0, 32)}_${Date.now().toString(36)}_${randomFragment}`;
}

function buildActiveUserPatch(input: {
  userId: string;
  canonicalEventName: string;
  nowMs: number;
  params: Record<string, string | number | boolean>;
  eventModules: readonly string[];
}) {
  return {
    uid: input.userId,
    username: readStringParam(input.params, "username", "user_name", "display_name", "displayName"),
    lastSeenAt: input.nowMs,
    lastEventName: input.canonicalEventName,
    lastPagePath: readStringParam(input.params, "page_path", "pagePath"),
    lastDropTitle: readStringParam(input.params, "drop_title", "dropTitle"),
    lastSemanticScopeLabel: readStringParam(input.params, "semantic_scope_label", "semanticScopeLabel"),
    lastComponentName: readStringParam(input.params, "component_name", "componentName"),
    lastEventModules: input.eventModules.join(", "),
    source: "identified_server_event",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
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
  const enrichedParams: Record<string, string | number | boolean> = {
    ...sanitizedParams,
    ...metadataParams,
    tracking_origin: "server",
    ...buildAnalyticsSemanticParams({
      pagePath: readStringParam(sanitizedParams, "page_path", "pagePath"),
      dropId: readStringParam(sanitizedParams, "drop_id", "dropId"),
      dropCategory: readStringParam(sanitizedParams, "drop_category", "dropCategory"),
    }),
  };
  const pagePath = readStringParam(enrichedParams, "page_path", "pagePath");
  const explicitAdminId = readStringParam(enrichedParams, "admin_id", "adminId");
  const explicitActorType = readStringParam(enrichedParams, "actor_type", "actorType");
  const explicitActorUid = readStringParam(enrichedParams, "actor_uid", "actorUid");
  const explicitActorRole = readStringParam(enrichedParams, "actor_role", "actorRole");
  const performedAs = readStringParam(enrichedParams, "performed_as", "performedAs");
  const targetUserId = readStringParam(enrichedParams, "target_user_id", "targetUserId");
  const targetCreatorId = readStringParam(enrichedParams, "target_creator_id", "targetCreatorId", "creator_id", "creatorId");
  const adminRouteOrEvent = option?.category === "admin"
    || canonicalEventName.startsWith("admin_")
    || pagePath === "/admin"
    || pagePath.startsWith("/admin/");
  const inclusion = explainEventInclusion({
    eventName: canonicalEventName,
    userId,
    adminId: adminRouteOrEvent ? explicitActorUid || explicitAdminId || userId : explicitAdminId,
    actorType: explicitActorType || (adminRouteOrEvent ? "admin" : userId ? "user" : "system"),
    roles: explicitActorRole ? [explicitActorRole] : null,
    route: pagePath,
    surface: "server",
    source: "server",
  });
  const actorClassification = inclusion.actorClassification;
  const actorAdminId = actorClassification.isAdmin ? (explicitActorUid || explicitAdminId || userId || "") : "";
  const actorCreatorId = actorClassification.isCreator
    ? (readStringParam(enrichedParams, "actor_creator_id", "actorCreatorId", "creator_actor_id", "creatorActorId", "creator_uid", "creatorUid") || explicitActorUid || userId || "")
    : "";
  const actorUserId = actorClassification.actorType === "user" ? (readStringParam(enrichedParams, "actor_user_id", "actorUserId") || explicitActorUid || userId || "") : "";
  const normalizedEventFact = inclusion.includeInUserBehavior
    ? normalizeBehavioralEventFact({
      eventId: buildServerEventId(userId, canonicalEventName),
      eventName: canonicalEventName,
      params: enrichedParams,
      timestamp: nowMs,
      userId,
      sessionId: readStringParam(enrichedParams, "session_id", "sessionId"),
      pagePath,
      dropId: readStringParam(enrichedParams, "drop_id", "dropId"),
      creatorId: readStringParam(enrichedParams, "creator_id", "creatorId"),
      assetKey: readStringParam(enrichedParams, "asset_key", "assetKey"),
      assetIndex: readNullableNumberParam(enrichedParams, "asset_index", "assetIndex") ?? undefined,
      source: "server",
      valueUsd: readNullableNumberParam(enrichedParams, "gross_revenue_usd", "grossRevenueUsd", "amount_usd", "amountUsd", "price_usd", "priceUsd") ?? undefined,
      gumDropsAmount: readNullableNumberParam(enrichedParams, "delivered_gumdrops", "deliveredGumDrops", "paid_gumdrops", "paidGumDrops", "gumdrops_amount", "gumDropsAmount") ?? undefined,
    })
    : null;
  const transactionId = readStringParam(enrichedParams, "transaction_id", "transactionId", "purchase_id", "purchaseId", "order_id", "orderId");
  const sourceTruth = readStringParam(enrichedParams, "source_truth", "sourceTruth")
    || (canonicalEventName === "purchase_verified" ? "canonical" : normalizedEventFact?.sourceTruth ?? "server");
  const sourceConfidence = sourceTruth === "canonical" ? 1 : normalizedEventFact?.confidence ?? 0.98;

  try {
    const timeKeys = buildAnalyticsTimeKeys(nowMs);
    const eventId = normalizedEventFact?.eventId || buildServerEventId(userId, canonicalEventName);
    const writes: Array<Promise<unknown>> = [
      adminDb.collection("analytics_event_facts").doc(eventId).set({
        eventId,
        source: userId ? "authenticated_server" : "server",
        consentMode: userId ? "identified" : "server",
        eventName: canonicalEventName,
        idempotencyKey: eventId,
        sourceLayer: "observed",
        sourceSurface: "server",
        userId: userId || "",
        analyticsUserId: inclusion.includeInUserBehavior && userId ? userId : "",
        adminId: actorAdminId,
        actorUserId,
        actorAdminId,
        actorCreatorId,
        actorUid: explicitActorUid || userId || "",
        actorRole: explicitActorRole,
        performedAs,
        targetUserId,
        targetCreatorId,
        transactionId,
        sourceTruth,
        sourceConfidence,
        actionKey: readStringParam(enrichedParams, "action_key", "actionKey"),
        actorClassificationReason: readStringParam(enrichedParams, "actor_classification_reason", "actorClassificationReason"),
        unknownActorBlocked: enrichedParams.unknown_actor_blocked === true || enrichedParams.unknownActorBlocked === true,
        actorType: actorClassification.actorType,
        actorLane: actorClassification.actorLane,
        includeInUserBehavior: inclusion.includeInUserBehavior,
        includeInAdminAnalytics: inclusion.includeInAdminAnalytics,
        analyticsExclusionReason: inclusion.exclusionReason ?? "",
        username: "",
        timestamp: nowMs,
        clientTimestamp: nowMs,
        serverTimestamp: nowMs,
        userAgent: "server",
        pagePath,
        sessionId: readStringParam(enrichedParams, "session_id", "sessionId"),
        dayKey: timeKeys.dayKey,
        hourKey: timeKeys.hourKey,
        minuteKey: timeKeys.minuteKey,
        dropId: readStringParam(enrichedParams, "drop_id", "dropId"),
        dropTitle: readStringParam(enrichedParams, "drop_title", "dropTitle"),
        dropCategory: readStringParam(enrichedParams, "drop_category", "dropCategory"),
        assetKey: readStringParam(enrichedParams, "asset_key", "assetKey"),
        assetIndex: readNullableNumberParam(enrichedParams, "asset_index", "assetIndex"),
        contentKind: readStringParam(enrichedParams, "content_kind", "contentKind"),
        destination: readStringParam(enrichedParams, "destination"),
        destinationType: readStringParam(enrichedParams, "destination_type", "destinationType"),
        sessionWatchSeconds: readNullableNumberParam(enrichedParams, "session_watch_seconds", "sessionWatchSeconds"),
        watchSeconds: readNullableNumberParam(enrichedParams, "watch_seconds", "watchSeconds"),
        durationMs: readNullableNumberParam(enrichedParams, "duration_ms", "durationMs"),
        loadMs: readNullableNumberParam(enrichedParams, "load_ms", "loadMs"),
        viewportWidth: null,
        viewportHeight: null,
        isMobileViewport: null,
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
        behavioralEventFactVersion: normalizedEventFact ? BEHAVIORAL_EVENT_FACT_VERSION : "",
        normalizedActionName: normalizedEventFact?.normalizedAction ?? "",
        normalizedActionId: normalizedEventFact?.dedupeKey ?? "",
        normalizedActionConfidence: normalizedEventFact?.confidence ?? 0,
        normalizedActionSourceTruth: normalizedEventFact?.sourceTruth ?? "",
        normalizedActionReasonCode: normalizedEventFact?.reasonCode ?? "",
        actionEntityId: normalizedEventFact?.entityId ?? "",
        actionEntityType: normalizedEventFact?.entityType ?? "",
        actionSourceComponent: normalizedEventFact?.sourceComponent ?? "",
        actionRoute: normalizedEventFact?.route ?? "",
        actionDropId: normalizedEventFact?.dropId ?? "",
        actionFileId: normalizedEventFact?.fileId ?? "",
        actionCreatorId: normalizedEventFact?.creatorId ?? "",
        actionTransactionId: normalizedEventFact?.transactionId ?? "",
        actionThreadId: normalizedEventFact?.threadId ?? "",
        actionNotificationId: normalizedEventFact?.notificationId ?? "",
        actionTaskId: normalizedEventFact?.taskId ?? "",
        guestUserAdminSeparation: {
          guestOrAnonymous: actorClassification.isGuestLike,
          authenticatedUser: actorClassification.isAuthenticatedUser,
          creator: actorClassification.isCreator,
          admin: actorClassification.isAdmin,
          system: actorClassification.isSystem,
          unknown: actorClassification.isUnknown,
        },
        params: enrichedParams,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ];

    if (userId && inclusion.includeInUserBehavior) {
      writes.push(
        adminDb
          .collection(ANALYTICS_OPERATIONAL_COLLECTIONS.activeUsers)
          .doc(userId)
          .set(
            buildActiveUserPatch({
              userId,
              canonicalEventName,
              nowMs,
              params: enrichedParams,
              eventModules: option?.modules || [],
            }),
            { merge: true },
          ),
      );
    }

    await Promise.all(writes);
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
