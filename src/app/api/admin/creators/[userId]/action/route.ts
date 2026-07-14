import { NextRequest, NextResponse } from "next/server";

import { parseCreatorAdminActionRequest, executeCreatorAdminAction } from "@/lib/server/creator-admin-actions";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const ADMIN_CREATOR_ACTION_BODY_LIMIT_BYTES = 64_000;

function readRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

async function POST_handler(request: NextRequest, context: RouteContext) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "admin/creators/action",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const { userId } = await context.params;
    const rawBody = await readBoundedJsonBody<unknown>(request, {
      maxBytes: ADMIN_CREATOR_ACTION_BODY_LIMIT_BYTES,
      routeName: "admin/creators/action",
      allowEmpty: false,
    });
    const body = parseCreatorAdminActionRequest(rawBody);
    const result = await executeCreatorAdminAction({
      userId,
      request: body,
      caller: {
        uid: caller?.uid,
        email: caller?.email,
      },
      signerIp: readRequestIp(request),
      signerUserAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        code: error.code,
        error: error.message,
        retryable: false,
      }, { status: error.status });
    }
    return handleApiError(error, "Admin.Creators.Action.POST");
  }
}

export let POST = withRouteRuntimeHealth("admin/creators/[userId]/action:POST", POST_handler);
