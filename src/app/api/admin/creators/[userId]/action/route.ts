import { NextRequest, NextResponse } from "next/server";

import { parseCreatorAdminActionRequest, executeCreatorAdminAction } from "@/lib/server/creator-admin-actions";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

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
    const body = parseCreatorAdminActionRequest(await request.json().catch(() => ({})));
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
    return handleApiError(error, "Admin.Creators.Action.POST");
  }
}

export let POST = withRouteRuntimeHealth("admin/creators/[userId]/action:POST", POST_handler);
