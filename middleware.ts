import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_VISITED_PATH_COOKIE,
  LAST_VISITED_PATH_OWNER_COOKIE,
  resolvePreferredAuthenticatedPath,
} from "@/lib/navigation-persistence";
import { CREATOR_WAITLIST_PATH } from "@/lib/creator-application";
import {
  MAINTENANCE_ADMIN_SESSION_COOKIE,
  NAV_SESSION_COOKIE,
  verifyMaintenanceAdminSessionCookieValue,
  verifyNavigationSessionCookieValue,
} from "@/lib/navigation-session";
import { isMaintenanceModeEnabled } from "@/lib/maintenance-mode";
import { getCanonicalSiteHost } from "@/lib/site-origin";
import { cheap4xxResponse } from "@/lib/server/cheap-4xx-response";
import { isInternalBypassPath, isKnownBotProbePath, isKnownLegacyPath } from "@/lib/server/route-4xx-classifier";

const MAINTENANCE_ADMIN_BOOTSTRAP_PATH = "/maintenance/admin";
const NAVIGATION_SESSION_PATH = "/api/auth/navigation-session";
const ADMIN_API_PATH = "/api/admin";
const ADMIN_DROP_PREFLIGHT_PATH = "/api/drops/duplicate-filenames";

function buildMaintenanceResponse() {
  const adminAccess = '<p class="admin-access"><a href="/maintenance/admin">Admin access</a></p>';

  const body = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>KandyDrops Maintenance</title>
        <style>
          :root {
            color-scheme: dark;
          }

          html, body {
            margin: 0;
            min-height: 100%;
          }

          body {
            font-family: "Trebuchet MS", "Segoe UI", Arial, sans-serif;
            display: grid;
            place-items: center;
            background: radial-gradient(circle at 20% 15%, #3f1d54 0%, #140b2a 45%, #06050e 100%);
            color: #f5ecff;
            text-align: center;
            padding: 2rem 1rem;
          }

          .card {
            width: min(760px, 100%);
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(244, 171, 255, 0.45);
            border-radius: 24px;
            backdrop-filter: blur(8px);
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(4, 0, 24, 0.35);
          }

          .mark {
            width: 56px;
            height: 56px;
            margin: 0 auto 1rem;
            border-radius: 50%;
            display: grid;
            place-items: center;
            background: linear-gradient(140deg, #f2a4ff, #8c43ff);
            color: #1f0b2a;
            font-weight: 900;
            font-size: 1.7rem;
          }

          h1 {
            margin: 0 0 0.75rem;
            font-size: clamp(1.6rem, 4vw, 2rem);
            letter-spacing: 0.02em;
          }

          p {
            margin: 0.75rem 0;
            line-height: 1.5;
            font-size: 1.05rem;
            color: #e6def3;
          }

          .admin-access {
            margin-top: 1.5rem;
          }

          .admin-access a {
            display: inline-flex;
            align-items: center;
            min-height: 44px;
            padding: 0 1rem;
            border-radius: 999px;
            background: #f2a4ff;
            color: #1f0b2a;
            font-weight: 800;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <main class="card">
          <div class="mark" aria-hidden="true">K</div>
          <h1>KandyDrops is upgrading!</h1>
          <p>We&rsquo;ll be back soon.</p>
          <p>Your KandyDrops and GumDrops are safe!</p>
          ${adminAccess}
        </main>
      </body>
    </html>
  `;

  return new NextResponse(body, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "120",
      "content-security-policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none';",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    },
  });
}

function isAdminPagePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isReviewedAdminApiPath(pathname: string) {
  return pathname === ADMIN_API_PATH
    || pathname.startsWith(ADMIN_API_PATH + "/")
    || pathname === ADMIN_DROP_PREFLIGHT_PATH;
}

function isMaintenanceTicketPath(pathname: string) {
  return isAdminPagePath(pathname) || isReviewedAdminApiPath(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let navigationSession: Awaited<ReturnType<typeof verifyNavigationSessionCookieValue>> | undefined;
  const getNavigationSession = async () => {
    if (navigationSession === undefined) {
      navigationSession = await verifyNavigationSessionCookieValue(
        request.cookies.get(NAV_SESSION_COOKIE)?.value,
      );
    }

    return navigationSession;
  };

  if (isMaintenanceModeEnabled()) {
    if (
      pathname === MAINTENANCE_ADMIN_BOOTSTRAP_PATH
      || (pathname === NAVIGATION_SESSION_PATH && request.method === "POST")
    ) {
      return NextResponse.next();
    }

    if (isMaintenanceTicketPath(pathname)) {
      const ticket = await verifyMaintenanceAdminSessionCookieValue(
        request.cookies.get(MAINTENANCE_ADMIN_SESSION_COOKIE)?.value,
      );

      if (ticket) {
        return NextResponse.next();
      }
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          state: "maintenance",
          message: "KandyDrops is upgrading. We will be back soon.",
        },
        {
          status: 503,
          headers: {
            "cache-control": "no-store",
            "retry-after": "120",
            "content-security-policy": "default-src 'none';",
            "x-frame-options": "DENY",
            "referrer-policy": "no-referrer",
            "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
          },
        },
      );
    }

    return buildMaintenanceResponse();
  }

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

  navigationSession = await getNavigationSession();
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)"],
};
