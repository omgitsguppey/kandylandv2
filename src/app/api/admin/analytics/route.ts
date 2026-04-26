export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

async function GET_handler(request: NextRequest) {
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
}

export let GET = withRouteRuntimeHealth("admin/analytics:GET", GET_handler);
