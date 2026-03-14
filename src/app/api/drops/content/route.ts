import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { isAllowedRemoteMediaUrl } from "@/lib/media-hosts";

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
    await checkRateLimit(request, "drops/content", RELAXED);
    const caller = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const dropId = searchParams.get("id");
    const indexStr = searchParams.get("index");
    const mediaIndex = indexStr ? parseInt(indexStr, 10) : 0;

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

    let dropRecord;
    try {
      dropRecord = normalizeDropRecord(dropSnap.data(), dropId);
    } catch {
      return NextResponse.json({ error: "No content available" }, { status: 404 });
    }

    const availableUrls = Array.isArray(dropRecord.contentUrls) && dropRecord.contentUrls.length > 0
      ? dropRecord.contentUrls
      : (dropRecord.contentUrl ? [dropRecord.contentUrl] : []);

    const targetUrl = availableUrls[mediaIndex];

    if (!targetUrl) {
      return NextResponse.json({ error: "Content index out of bounds" }, { status: 404 });
    }
    if (!isAllowedRemoteMediaUrl(targetUrl)) {
      return NextResponse.json({ error: "Content URL is not allowed" }, { status: 400 });
    }

    // Proxy the stream natively to hide the raw Firebase Storage URL
    const contentRes = await fetch(targetUrl, {
      headers: {
        range: request.headers.get("range") || "",
      },
      // Important to explicitly avoid caching the payload on the Next.js edge
      cache: "no-store",
    });

    // Pipe upstream headers downstream (Content-Type, Content-Length, Content-Range, Accept-Ranges, etc)
    const headers = new Headers(contentRes.headers);
    headers.set("Content-Disposition", "inline");

    // Return the literal byte stream safely proxied through Next.js
    return new NextResponse(contentRes.body, {
      status: contentRes.status,
      statusText: contentRes.statusText,
      headers,
    });
  } catch (error) {
    return handleApiError(error, "Drops.Content");
  }
}
