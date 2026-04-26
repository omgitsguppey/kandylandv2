import { NextRequest, NextResponse } from "next/server";

import { rotateUserTasks } from "@/lib/server/daily-tasks";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

async function POST_handler(req: NextRequest) {
  try {
    const caller = await guardApiRequest(req, {
      routeName: "tasks_rotate",
      rateLimit: STANDARD,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });
    const uid = caller?.uid ?? "";
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

export let POST = withRouteRuntimeHealth("tasks/rotate:POST", POST_handler);
