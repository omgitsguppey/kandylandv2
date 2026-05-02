import { NextRequest, NextResponse } from "next/server";

import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { trackServerEvent } from "@/lib/server/analytics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
  CREATOR_ONBOARDING_COLLECTION,
  CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
  isCreatorOwnerEmail,
} from "@/lib/server/creator-onboarding";
import {
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildActorMarkerDebugFields,
  buildAdminOnBehalfMarker,
} from "@/lib/identity/actor-markers";
import {
  buildAdminViewAsDebugFields,
  normalizeSyntheticCreatorType,
  parseAdminViewAsState,
} from "@/lib/admin/synthetic-creators-view-as";
import type { CreatorOnboardingHistoryEventType } from "@/lib/creator-onboarding";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : Date.now();
}

function normalizeAction(value: unknown): "start" | "end" | "blocked" {
  return value === "end" || value === "blocked" ? value : "start";
}

function buildEventType(action: "start" | "end" | "blocked"): CreatorOnboardingHistoryEventType {
  if (action === "end") {
    return "admin_view_as_ended";
  }
  if (action === "blocked") {
    return "admin_view_as_action_blocked";
  }
  return "admin_view_as_started";
}

function buildTelemetryEvent(action: "start" | "end" | "blocked") {
  if (action === "end") {
    return "admin_view_as_creator_ended";
  }
  if (action === "blocked") {
    return "admin_view_as_creator_action_blocked";
  }
  return "admin_view_as_creator_started";
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "admin/view-as-creator",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminDb || !caller) {
      return NextResponse.json({ error: "Admin view-as is unavailable." }, { status: 500 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = normalizeAction(body.action);
    const targetUserId = readString(body.targetUserId);
    const reason = readString(body.reason);
    const route = readString(body.route) || "/admin/roster";
    const returnHref = readString(body.returnHref) || "/admin/roster";
    const nowMs = Date.now();
    const simulationStartedAt = readTimestamp(body.simulationStartedAt);

    if (!targetUserId) {
      return NextResponse.json({ error: "Select a creator before starting view-as mode." }, { status: 400 });
    }
    if (action === "start" && reason.length < 4) {
      return NextResponse.json({ error: "Enter a short QA reason before viewing as a creator." }, { status: 400 });
    }

    const targetRef = adminDb.collection("users").doc(targetUserId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      return buildNotFoundResponse("user", "Creator account was not found.");
    }

    const target = targetSnap.data() as Record<string, unknown>;
    const isCreatorAccount = target.role === "creator"
      || target.creator === true
      || (target.creatorApplication && typeof target.creatorApplication === "object");
    if (!isCreatorAccount) {
      return NextResponse.json({ error: "View-as mode is only available for creator accounts." }, { status: 400 });
    }

    const marker = assertKnownActor(buildAdminOnBehalfMarker(
      {
        uid: caller.uid,
        email: caller.email,
        role: isCreatorOwnerEmail(caller.email) ? "owner_admin" : "admin",
        isAdmin: true,
        isOwner: isCreatorOwnerEmail(caller.email),
      },
      targetUserId,
      {
        surface: "admin_roster",
        route: "/api/admin/view-as-creator",
        actionKey: buildTelemetryEvent(action),
        source: "admin_view_as_creator_route",
        performedAs: "admin_view_as_creator",
        targetCreatorId: targetUserId,
      },
    ));

    const viewAsState = action === "end" ? null : parseAdminViewAsState({
      adminViewingAsUserId: targetUserId,
      adminViewingAsDisplayName: readString(target.displayName) || readString(target.username) || "Creator",
      adminViewingAsRole: "creator",
      simulationStartedAt,
      simulationReason: reason,
      viewAsActorUid: caller.uid,
      viewAsReturnHref: returnHref,
    });
    const debugFields = {
      ...buildAdminViewAsDebugFields(viewAsState),
      syntheticCreatorMarkerPresent: target.isSyntheticCreator === true,
    };
    const eventType = buildEventType(action);
    const eventSummary = action === "end"
      ? "Admin returned from creator view"
      : action === "blocked"
        ? "View-as action blocked"
        : "Admin started creator view";

    await Promise.all([
      targetRef.set({
        adminViewAsDebug: {
          ...debugFields,
          lastViewAsAction: action,
          lastViewAsActionAt: nowMs,
          viewAsActorUid: caller.uid,
        },
      }, { merge: true }),
      adminDb
        .collection(CREATOR_ONBOARDING_COLLECTION)
        .doc(targetUserId)
        .collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION)
        .doc(`${eventType}_${nowMs}_${caller.uid}`)
        .set({
          eventType,
          actorId: caller.uid,
          actorRole: marker.actorType === "owner_admin" ? "owner_admin" : "admin",
          actorLabel: caller.email ?? caller.uid,
          timestamp: nowMs,
          summary: eventSummary,
          detail: reason || route,
          metadata: {
            route,
            returnHref,
            simulationStartedAt,
            syntheticCreatorType: target.isSyntheticCreator === true
              ? normalizeSyntheticCreatorType(target.syntheticCreatorType)
              : "",
            ...debugFields,
            ...buildActorMarkerDebugFields(marker),
          },
        }, { merge: true }),
      trackServerEvent(buildTelemetryEvent(action), {
        page_path: route,
        reason,
        syntheticCreatorType: target.isSyntheticCreator === true
          ? normalizeSyntheticCreatorType(target.syntheticCreatorType)
          : readString(body.syntheticCreatorType),
        synthetic_creator_type: target.isSyntheticCreator === true
          ? normalizeSyntheticCreatorType(target.syntheticCreatorType)
          : readString(body.syntheticCreatorType),
        ...debugFields,
        ...actorMarkerToTelemetryPayload(marker),
      }, targetUserId),
    ]);

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      debug: debugFields,
    });
  } catch (error) {
    return handleApiError(error, "Admin.ViewAsCreator.POST");
  }
}

export let POST = withRouteRuntimeHealth("admin/view-as-creator:POST", POST_handler);
