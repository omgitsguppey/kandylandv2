import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_VISITED_PATH_COOKIE,
  resolvePreferredAuthenticatedPath,
} from "@/lib/navigation-persistence";
import { verifyNavigationSessionCookieValue, NAV_SESSION_COOKIE } from "@/lib/navigation-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const navigationSession = await verifyNavigationSessionCookieValue(
    request.cookies.get(NAV_SESSION_COOKIE)?.value,
  );
  if (!navigationSession) {
    return NextResponse.next();
  }

  const lastVisitedPath = request.cookies.get(LAST_VISITED_PATH_COOKIE)?.value;
  const destination = resolvePreferredAuthenticatedPath(navigationSession.role, lastVisitedPath);
  const fallbackPath = navigationSession.role === "admin" ? "/admin" : "/dashboard";

  if (pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination.split("?")[0] || fallbackPath;

    const queryIndex = destination.indexOf("?");
    redirectUrl.search = queryIndex >= 0 ? destination.slice(queryIndex) : "";

    return NextResponse.redirect(redirectUrl);
  }

  if (navigationSession.role === "admin" && pathname.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination.split("?")[0] || fallbackPath;
    const queryIndex = destination.indexOf("?");
    redirectUrl.search = queryIndex >= 0 ? destination.slice(queryIndex) : "";
    return NextResponse.redirect(redirectUrl);
  }

  if (navigationSession.role !== "admin" && pathname.startsWith("/admin")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination.split("?")[0] || fallbackPath;
    const queryIndex = destination.indexOf("?");
    redirectUrl.search = queryIndex >= 0 ? destination.slice(queryIndex) : "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
