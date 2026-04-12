import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN } from "@/lib/server/rate-limit";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function PATCH(
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

    // Check if username is already taken by another user
    const usernameQuery = await adminDb
      .collection("users")
      .where("username", "==", newUsername)
      .limit(1)
      .get();

    if (!usernameQuery.empty) {
      const takenBy = usernameQuery.docs[0];
      if (takenBy.id !== userId) {
        return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 409 });
      } else {
        // Same user, no change needed
        return NextResponse.json({ success: true, message: "Username is unchanged" });
      }
    }

    // Update the username
    await userRef.update({
      username: newUsername,
      updatedAt: Date.now(),
      updatedBy: adminAuth && 'uid' in adminAuth ? adminAuth.uid : "system"
    });

    return NextResponse.json({ success: true, username: newUsername });
  } catch (error: any) {
    console.error("[Admin Username Update API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
