import { NextRequest, NextResponse } from "next/server";

import { NavigationRole } from "@/lib/navigation-persistence";
import { createNavigationSessionCookieValue, NAV_SESSION_COOKIE, NAV_SESSION_MAX_AGE_SECONDS } from "@/lib/navigation-session";
import { getCreatorNavigationState, normalizeCreatorApplication } from "@/lib/creator-application";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildIdentity4xxResponse } from "@/lib/identity-truth/identity-handoff-4xx-policy";

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "auth/navigation-session",
      rateLimit: RELAXED,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    const userId = caller?.uid ?? "";
    if (!userId) {
      const payload = buildIdentity4xxResponse("missing_user_id", {
        route: "auth/navigation-session",
        actorKind: "signed_in_user",
      });
      return NextResponse.json(payload, { status: payload.statusCode });
    }

    // cost-bound: single Firestore document read scoped to authenticated navigation session; not a collection scan.
    const profileSnapshot = await adminDb.collection("users").doc(userId).get();
    const profileData = profileSnapshot.data() ?? {};
    const role = (profileData.role || "user") as NavigationRole;
    const creatorNavigationState = getCreatorNavigationState(
      normalizeCreatorApplication(profileData.creatorApplication),
      role,
    );
    const cookieValue = await createNavigationSessionCookieValue(
      userId,
      role,
      creatorNavigationState ?? "default",
    );
    if (!cookieValue) {
      await recordServerDiagnostic({
        channel: "auth",
        severity: "warn",
        message: "Navigation session signing unavailable",
        detail: {
          route: "auth/navigation-session",
          userId,
          role,
          state: creatorNavigationState ?? "default",
        },
      });
      return NextResponse.json({
        success: false,
        sourceState: "unavailable",
        reason: "navigation_session_signing_unavailable",
      });
    }

    const response = NextResponse.json({ success: true, role, state: creatorNavigationState ?? "default" });
    response.cookies.set({
      name: NAV_SESSION_COOKIE,
      value: cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: NAV_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return handleApiError(error, "auth/navigation-session");
  }
}

async function DELETE_handler(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "auth/navigation-session",
      rateLimit: RELAXED,
      requireTrustedOrigin: true,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: NAV_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return handleApiError(error, "auth/navigation-session");
  }
}

export let POST = withRouteRuntimeHealth("auth/navigation-session:POST", POST_handler);
export let DELETE = withRouteRuntimeHealth("auth/navigation-session:DELETE", DELETE_handler);
