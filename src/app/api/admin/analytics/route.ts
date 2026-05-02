export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN_ANALYTICS } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

async function GET_handler(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/analytics",
      rateLimit: ADMIN_ANALYTICS,
      auth: "admin",
    });

    const redirectUrl = request.nextUrl.clone();
    const searchParams = redirectUrl.searchParams;
    const type = searchParams.get("type");

    if (type === "realtime") {
      redirectUrl.pathname = "/api/admin/analytics/realtime";
      searchParams.delete("type");
      redirectUrl.search = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return NextResponse.redirect(redirectUrl);
    }

    if (type === "historical") {
      redirectUrl.pathname = "/api/admin/analytics/historical";
      searchParams.delete("type");
      redirectUrl.search = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.json({ error: "Invalid query type" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "Admin.Analytics.Redirect.GET");
  }
}

export let GET = withRouteRuntimeHealth("admin/analytics:GET", GET_handler);
