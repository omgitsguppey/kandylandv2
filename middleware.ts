import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_VISITED_PATH_COOKIE,
  LAST_VISITED_PATH_OWNER_COOKIE,
  resolvePreferredAuthenticatedPath,
} from "@/lib/navigation-persistence";
import { CREATOR_WAITLIST_PATH } from "@/lib/creator-application";
import { verifyNavigationSessionCookieValue, NAV_SESSION_COOKIE } from "@/lib/navigation-session";
import { getCanonicalSiteHost } from "@/lib/site-origin";
import { cheap4xxResponse } from "@/lib/server/cheap-4xx-response";
import { isInternalBypassPath, isKnownBotProbePath, isKnownLegacyPath } from "@/lib/server/route-4xx-classifier";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalBypassPath(pathname)) {
    return NextResponse.next();
  }

  if (isKnownBotProbePath(pathname)) {
    return cheap4xxResponse({
      status: 404,
      code: "bot_probe_path_blocked",
      message: "Not found",
      class: "bot_probe",
      cacheTtlSeconds: 300,
      contentType: "text",
    });
  }

  if (isKnownLegacyPath(pathname)) {
    return cheap4xxResponse({
      status: 410,
      code: "legacy_route_gone",
      message: "This route is no longer supported.",
      class: "legacy_route",
      cacheTtlSeconds: 120,
    });
  }

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
  const lastVisitedPathOwner = request.cookies.get(LAST_VISITED_PATH_OWNER_COOKIE)?.value;
  const destination = resolvePreferredAuthenticatedPath(
    navigationSession.role,
    lastVisitedPath,
    lastVisitedPathOwner,
    navigationSession.uid,
  );
  const preferredDestination = navigationSession.state === "creator_waitlist"
    ? CREATOR_WAITLIST_PATH
    : destination;
  const fallbackPath = navigationSession.role === "admin" ? "/admin" : "/dashboard";
  const isAdmin = navigationSession.role === "admin";

  if (pathname === "/" && isAdmin) {
    return NextResponse.next();
  }

  if (navigationSession.state === "creator_waitlist" && pathname === "/dashboard") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = CREATOR_WAITLIST_PATH;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = preferredDestination.split("?")[0] || fallbackPath;

    const queryIndex = preferredDestination.indexOf("?");
    redirectUrl.search = queryIndex >= 0 ? preferredDestination.slice(queryIndex) : "";

    return NextResponse.redirect(redirectUrl);
  }

  if (navigationSession.role !== "admin" && pathname.startsWith("/admin")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = preferredDestination.split("?")[0] || fallbackPath;
    const queryIndex = preferredDestination.indexOf("?");
    redirectUrl.search = queryIndex >= 0 ? preferredDestination.slice(queryIndex) : "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
