import { NextRequest, NextResponse } from "next/server";

import { NavigationRole } from "@/lib/navigation-persistence";
import { createNavigationSessionCookieValue, NAV_SESSION_COOKIE, NAV_SESSION_MAX_AGE_SECONDS } from "@/lib/navigation-session";
import { getCreatorNavigationState, normalizeCreatorApplication } from "@/lib/creator-application";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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
        severity: "error",
        message: "Navigation session signing unavailable",
        detail: {
          route: "auth/navigation-session",
          userId,
          role,
          state: creatorNavigationState ?? "default",
        },
      });
      return NextResponse.json({ error: "Navigation session unavailable" }, { status: 503 });
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

export async function DELETE(request: NextRequest) {
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
