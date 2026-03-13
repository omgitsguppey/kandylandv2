import { NextRequest, NextResponse } from "next/server";

import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { RELAXED, checkRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, "tasks_track_share", RELAXED);
    await verifyAuth(req);
    return NextResponse.json({ success: true, deprecated: true });
  } catch (error) {
    return handleApiError(error, "tasks/track-share");
  }
}
