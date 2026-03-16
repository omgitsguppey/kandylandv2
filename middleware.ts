import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_VISITED_PATH_COOKIE,
  NAV_AUTH_COOKIE,
  NAV_ROLE_COOKIE,
  isPersistableAppPath,
} from "@/lib/navigation-persistence";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/") {
    return NextResponse.next();
  }

  const isLoggedIn = request.cookies.get(NAV_AUTH_COOKIE)?.value === "1";
  if (!isLoggedIn) {
    return NextResponse.next();
  }

  const role = request.cookies.get(NAV_ROLE_COOKIE)?.value;
  const lastVisitedPath = request.cookies.get(LAST_VISITED_PATH_COOKIE)?.value;
  const fallbackPath = role === "admin" ? "/admin" : "/dashboard";
  const destination = lastVisitedPath && isPersistableAppPath(lastVisitedPath)
    ? lastVisitedPath
    : fallbackPath;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = destination.split("?")[0] || fallbackPath;

  const queryIndex = destination.indexOf("?");
  redirectUrl.search = queryIndex >= 0 ? destination.slice(queryIndex) : "";

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/"],
};
