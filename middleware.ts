import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_VISITED_PATH_COOKIE,
  resolvePreferredAuthenticatedPath,
} from "@/lib/navigation-persistence";
import { verifyNavigationSessionCookieValue, NAV_SESSION_COOKIE } from "@/lib/navigation-session";
import { getCanonicalSiteHost } from "@/lib/site-origin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHost = request.nextUrl.host;
  const canonicalSiteHost = getCanonicalSiteHost();

  if (requestHost === "kandydrops.com" && canonicalSiteHost && requestHost !== canonicalSiteHost) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = canonicalSiteHost;
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl, 308);
  }

  const navigationSession = await verifyNavigationSessionCookieValue(
    request.cookies.get(NAV_SESSION_COOKIE)?.value,
  );
  if (!navigationSession) {
    return NextResponse.next();
  }

  const lastVisitedPath = request.cookies.get(LAST_VISITED_PATH_COOKIE)?.value;
  const destination = resolvePreferredAuthenticatedPath(navigationSession.role, lastVisitedPath);
  const fallbackPath = navigationSession.role === "admin" ? "/admin" : "/dashboard";
  const allowAdminPublicHome =
    pathname === "/" &&
    navigationSession.role === "admin" &&
    request.nextUrl.searchParams.get("publicHome") === "1";

  if (allowAdminPublicHome) {
    return NextResponse.next();
  }

  if (pathname === "/") {
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
  matcher: ["/((?!api|_next|.*\\..*|__/).*)"],
};
