import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

// Legacy route retained for compatibility with older clients; share task progress is tracked elsewhere now.
export async function POST(req: NextRequest) {
  try {
    await guardApiRequest(req, {
      routeName: "tasks_track_share",
      rateLimit: RELAXED,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });

    return NextResponse.json({ success: true, deprecated: true });
  } catch (error) {
    return handleApiError(error, "tasks/track-share");
  }
}
