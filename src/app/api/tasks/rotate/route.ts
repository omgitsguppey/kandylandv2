import { NextRequest, NextResponse } from "next/server";

import { rotateUserTasks } from "@/lib/server/daily-tasks";
import { AuthError, handleApiError } from "@/lib/server/auth";
import { RateLimitError, STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

function buildTaskRotationClientError(
  status: number,
  errorCode:
    | "unauthenticated"
    | "forbidden"
    | "missing_task_assignment"
    | "rate_limited"
    | "invalid_task_rotation_request",
  message: string,
  retryAfterMs?: number,
) {
  return NextResponse.json({
    success: false,
    error: message,
    errorCode,
    routeStatus: "expected_typed_client_error",
    retryable: false,
    retryAfterMs: retryAfterMs ?? null,
  }, { status });
}

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
      windowState: result.windowState,
      rewardTotals: result.rewardTotals,
      repairIssues: result.repairIssues,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return buildTaskRotationClientError(
        error.status,
        error.status === 403 ? "forbidden" : "unauthenticated",
        error.status === 403 ? "Forbidden" : "Unauthorized",
      );
    }
    if (error instanceof RateLimitError) {
      return buildTaskRotationClientError(429, "rate_limited", "Too many task rotation requests.", error.retryAfterMs);
    }
    if (error instanceof Error && /user not found/i.test(error.message)) {
      return buildTaskRotationClientError(404, "missing_task_assignment", "Task profile is not available for this account.");
    }
    return handleApiError(error, "tasks/rotate");
  }
}

export let POST = withRouteRuntimeHealth("tasks/rotate:POST", POST_handler);
