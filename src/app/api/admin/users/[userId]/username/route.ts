import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN } from "@/lib/server/rate-limit";
import { reserveUsernameForUser } from "@/lib/server/username-suggestions";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

async function PATCH_handler(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const adminAuth = await guardApiRequest(request, {
      routeName: "admin/users/username",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminAuth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await context.params;
    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const newUsername = body.username?.toString().toLowerCase().trim();

    if (!newUsername) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
    }

    if (!USERNAME_REGEX.test(newUsername)) {
      return NextResponse.json({ 
        success: false, 
        error: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores" 
      }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const previousUsername = typeof userData?.username === "string" ? userData.username : null;

    if (previousUsername === newUsername) {
      return NextResponse.json({ success: true, message: "Username is unchanged" });
    }

    const updatedBy = adminAuth && "uid" in adminAuth ? adminAuth.uid : "system";
    const reservation = await reserveUsernameForUser({
      requestedUsername: newUsername,
      uid: userId,
      previousUsername,
      source: "admin_username_change",
      applyUserMutation: (transaction, normalizedUsername) => {
        transaction.update(userRef, {
          username: normalizedUsername,
          updatedAt: Date.now(),
          updatedBy,
        });
      },
    });

    if (!reservation.ok) {
      if (reservation.reason === "invalid") {
        return NextResponse.json({ success: false, error: "Invalid username format" }, { status: 400 });
      }

      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 409 });
    }

    return NextResponse.json({ success: true, username: reservation.normalizedUsername });
  } catch (error: any) {
    recordRouteWarning("admin/users/username", "Admin username update failed", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export let PATCH = withRouteRuntimeHealth("admin/users/[userId]/username:PATCH", PATCH_handler);
