import { NextRequest, NextResponse } from "next/server";

import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { RELAXED, checkRateLimit } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, "tasks_track_share", RELAXED);

    if (!hasTrustedSiteOrigin(req)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }

    await verifyAuth(req);
    return NextResponse.json({ success: true, deprecated: true });
  } catch (error) {
    return handleApiError(error, "tasks/track-share");
  }
}
