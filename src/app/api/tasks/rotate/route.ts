import { NextRequest, NextResponse } from "next/server";

import { rotateUserTasks } from "@/lib/server/daily-tasks";
import { handleApiError, verifyAuth } from "@/lib/server/auth";
import { STRICT, checkRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(req, "tasks_rotate", STRICT);
    const { uid } = await verifyAuth(req);
    const result = await rotateUserTasks(uid);

    return NextResponse.json({
      success: true,
      rotated: result.rotated,
      nextRefreshMs: result.nextRefreshMs,
      tasks: result.tasks,
    });
  } catch (error) {
    return handleApiError(error, "tasks/rotate");
  }
}
