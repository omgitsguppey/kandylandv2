import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { RELAXED } from "@/lib/server/rate-limit";
import { getTrustedClientIp } from "@/lib/server/request-client-ip";
import { getCSTDateKey } from "@/lib/timezone";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const bodySchema = z.object({
  dropId: z.string().trim().min(1).max(128),
  pagePath: z.string().trim().max(200).optional(),
  surface: z.string().trim().max(60).optional(),
  sessionId: z.string().trim().max(80).optional(),
});

function buildDayKey(timestamp: number) {
  return getCSTDateKey(timestamp);
}

function buildAnonymousFingerprint(request: NextRequest, dropId: string, dayKey: string, pagePath: string, surface: string) {
  const clientIp = getTrustedClientIp(request);
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
  return createHash("sha256")
    .update(`${clientIp}:${userAgent}:${dropId}:${dayKey}:${pagePath}:${surface}`)
    .digest("hex");
}

function buildImpressionReceiptId(dropId: string, dayKey: string, viewerKey: string) {
  return createHash("sha256")
    .update(`${dropId}:${dayKey}:${viewerKey}`)
    .digest("hex");
}

async function POST_handler(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "drops/impression",
      rateLimit: RELAXED,
      requireTrustedOrigin: true,
    });

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const { dropId, pagePath, surface, sessionId } = bodySchema.parse(await request.json());
    const nowMs = Date.now();
    const dayKey = buildDayKey(nowMs);
    const normalizedPagePath = pagePath || "/drops";
    const normalizedSurface = surface || "drops_grid";
    const viewerKey = sessionId?.trim() || buildAnonymousFingerprint(request, dropId, dayKey, normalizedPagePath, normalizedSurface);
    const receiptRef = adminDb.collection("drop_impression_receipts").doc(buildImpressionReceiptId(dropId, dayKey, viewerKey));
    const dropRef = adminDb.collection("drops").doc(dropId);
    const rollupRef = adminDb.collection("analytics_drop_daily").doc(`${dayKey}_${dropId}`);
    const dropSnapshot = await dropRef.get();
    if (!dropSnapshot.exists) {
      return buildNotFoundResponse("drop", "Drop not found");
    }

    const duplicate = await adminDb.runTransaction(async (transaction) => {
      const receiptSnapshot = await transaction.get(receiptRef);
      if (receiptSnapshot.exists) {
        return true;
      }

      transaction.set(receiptRef, {
        dropId,
        dayKey,
        viewerKey,
        pagePath: normalizedPagePath,
        surface: normalizedSurface,
        sessionId: sessionId || "",
        createdAt: FieldValue.serverTimestamp(),
        lastSeenAt: nowMs,
      }, { merge: true });
      transaction.set(dropRef, {
        totalViews: FieldValue.increment(1),
        lastViewedAt: nowMs,
      }, { merge: true });
      transaction.set(rollupRef, {
        dropId,
        dayKey,
        pagePath: normalizedPagePath,
        surface: normalizedSurface,
        sessionId: sessionId || "",
        eventCount: FieldValue.increment(1),
        viewCount: FieldValue.increment(1),
        lastSeenAt: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return false;
    });

    return NextResponse.json({ success: true, duplicate });
  } catch (error) {
    recordRouteWarning("drops/impression", "Failed to record drop impression", error);
    return NextResponse.json({ success: false, error: "Failed to record impression" }, { status: 500 });
  }
}

export let POST = withRouteRuntimeHealth("drops/impression:POST", POST_handler);
