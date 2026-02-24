import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";

const userContentSchema = z.object({
  unlockedContent: z.array(z.string()).default([]),
});

/**
 * GET /api/drops/content?id=<dropId>
 *
 * Authenticated content proxy. Verifies the user owns the drop,
 * then redirects to the real content URL. The raw URL never appears
 * in the client-side HTML source.
 */
export async function GET(request: NextRequest) {
  try {
    const caller = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const dropId = searchParams.get("id");

    if (!dropId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const userRef = adminDb.collection("users").doc(caller.uid);
    const dropRef = adminDb.collection("drops").doc(dropId);

    const [userSnap, dropSnap] = await Promise.all([userRef.get(), dropRef.get()]);

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dropSnap.exists) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    const userData = userContentSchema.parse(userSnap.data());
    if (!userData.unlockedContent.includes(dropId)) {
      return NextResponse.json({ error: "You do not own this content" }, { status: 403 });
    }

    const dropData = z.object({ contentUrl: z.string().min(1) }).safeParse(dropSnap.data());
    if (!dropData.success) {
      return NextResponse.json({ error: "No content available" }, { status: 404 });
    }

    return NextResponse.redirect(dropData.data.contentUrl);
  } catch (error) {
    return handleApiError(error, "Drops.Content");
  }
}
