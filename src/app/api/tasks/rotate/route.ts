import { NextRequest, NextResponse } from "next/server";

import { rotateUserTasks } from "@/lib/server/daily-tasks";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { STANDARD, checkRateLimit } from "@/lib/server/rate-limit";
import { hasTrustedSiteOrigin } from "@/lib/server/request-origin";

export async function POST(req: NextRequest) {
  try {
    if (!hasTrustedSiteOrigin(req)) {
      return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }
    const { uid } = await verifyAuth(req);
    await checkRateLimit(req, "tasks_rotate", STANDARD, { scopeId: uid });
    const result = await rotateUserTasks(uid);

    return NextResponse.json({
      success: true,
      state: result.state,
      rotated: result.rotated,
      nextRefreshMs: result.nextRefreshMs,
      tasks: result.tasks,
    });
  } catch (error) {
    return handleApiError(error, "tasks/rotate");
  }
}
