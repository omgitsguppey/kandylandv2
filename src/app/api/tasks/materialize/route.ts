import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { materializeDailyTaskResetWindows } from "@/lib/server/daily-tasks";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const TASK_MATERIALIZER_BODY_LIMIT_BYTES = 8_192;

async function POST_handler(req: NextRequest) {
  try {
    const internalToken = process.env.TASK_MATERIALIZER_TOKEN;
    const authorization = req.headers.get("authorization") || "";
    const hasSchedulerToken = Boolean(internalToken && authorization === `Bearer ${internalToken}`);
    if (!hasSchedulerToken) {
      await guardApiRequest(req, {
        routeName: "tasks_materialize",
        rateLimit: ADMIN,
        requireTrustedOrigin: true,
        auth: "admin",
      });
    }

    const body = await readBoundedJsonBody<{
      maxUsers?: number;
      cursorUserId?: string;
      maxRuntimeMs?: number;
      source?: "daily_task_materializer" | "debug_repair";
    }>(req, {
      maxBytes: TASK_MATERIALIZER_BODY_LIMIT_BYTES,
      routeName: "tasks/materialize",
      allowEmpty: true,
    });

    const result = await materializeDailyTaskResetWindows({
      maxUsers: body.maxUsers,
      cursorUserId: body.cursorUserId,
      maxRuntimeMs: body.maxRuntimeMs,
      source: body.source ?? "daily_task_materializer",
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: error.code,
        retryable: false,
      }, { status: error.status });
    }
    return handleApiError(error, "tasks/materialize");
  }
}

export let POST = withRouteRuntimeHealth("tasks/materialize:POST", POST_handler);
