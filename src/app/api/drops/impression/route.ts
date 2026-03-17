import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { checkRateLimit, RELAXED } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

const bodySchema = z.object({
  dropId: z.string().trim().min(1).max(128),
  pagePath: z.string().trim().max(200).optional(),
  surface: z.string().trim().max(60).optional(),
  sessionId: z.string().trim().max(80).optional(),
});

function buildDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    await checkRateLimit(request, "drops/impression", RELAXED);

    if (!hasTrustedSiteOrigin(request)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const { dropId, pagePath, surface, sessionId } = bodySchema.parse(await request.json());
    const nowMs = Date.now();
    const dayKey = buildDayKey(nowMs);
    const dropRef = adminDb.collection("drops").doc(dropId);
    const rollupRef = adminDb.collection("analytics_drop_daily").doc(`${dayKey}__${dropId}`);
    const dropSnapshot = await dropRef.get();
    if (!dropSnapshot.exists) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    const batch = adminDb.batch();
    batch.set(dropRef, {
      totalViews: FieldValue.increment(1),
      lastViewedAt: nowMs,
    }, { merge: true });
    batch.set(rollupRef, {
      dropId,
      dayKey,
      pagePath: pagePath || "/drops",
      surface: surface || "drops_grid",
      sessionId: sessionId || "",
      eventCount: FieldValue.increment(1),
      viewCount: FieldValue.increment(1),
      lastSeenAt: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record drop impression:", error);
    return NextResponse.json({ success: false, error: "Failed to record impression" }, { status: 500 });
  }
}
