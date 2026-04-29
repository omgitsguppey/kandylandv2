import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { MEDIA_PROXY, STANDARD } from "@/lib/server/rate-limit";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { isAllowedRemoteMediaUrl } from "@/lib/media-hosts";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

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
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "drops/content:GET",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    const caller = await guardApiRequest(request, {
      routeName: "drops/content",
      preAuthRouteName: "drops/content/preauth",
      preAuthRateLimit: STANDARD,
      rateLimit: MEDIA_PROXY,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });
    if (!caller) {
      return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const { searchParams } = new URL(request.url);
    const dropId = searchParams.get("id");
    const indexStr = searchParams.get("index");
    const mediaIndex = indexStr ? parseInt(indexStr, 10) : 0;

    if (!dropId) {
      return finalize(NextResponse.json({ error: "Missing id parameter" }, { status: 400 }));
    }
    if (!adminDb) {
      return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
    }

    const userRef = adminDb.collection("users").doc(caller.uid);
    const dropRef = adminDb.collection("drops").doc(dropId);

    const [userSnap, dropSnap] = await Promise.all([userRef.get(), dropRef.get()]);

    if (!userSnap.exists) {
      return finalize(buildNotFoundResponse("user", "User not found"));
    }

    if (!dropSnap.exists) {
      return finalize(buildNotFoundResponse("drop", "Drop not found"));
    }

    const userData = userContentSchema.parse(userSnap.data());
    if (!userData.unlockedContent.includes(dropId)) {
      return finalize(NextResponse.json({ error: "You do not own this content" }, { status: 403 }));
    }

    let dropRecord;
    try {
      dropRecord = normalizeDropRecord(dropSnap.data(), dropId);
    } catch {
      return finalize(buildNotFoundResponse("content", "No content available"));
    }

    const availableUrls = Array.isArray(dropRecord.contentUrls) && dropRecord.contentUrls.length > 0
      ? dropRecord.contentUrls
      : (dropRecord.contentUrl ? [dropRecord.contentUrl] : []);

    const targetUrl = availableUrls[mediaIndex];

    if (!targetUrl) {
      return finalize(buildNotFoundResponse("content", "Content index out of bounds"));
    }
    if (!isAllowedRemoteMediaUrl(targetUrl)) {
      return finalize(NextResponse.json({ error: "Content URL is not allowed" }, { status: 400 }));
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
    headers.set("Cache-Control", "private, no-store");

    // Return the literal byte stream safely proxied through Next.js
    return finalize(new NextResponse(contentRes.body, {
      status: contentRes.status,
      statusText: contentRes.statusText,
      headers,
    }));
  } catch (error) {
    return finalize(handleApiError(error, "Drops.Content"), error);
  }
}
