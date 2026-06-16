import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH,
  ADMIN_UI_TEST_SESSION_COOKIE_KEY,
  buildAdminUiTestSessionStorageValue,
  isAdminUiTestSessionRuntimeEnabled,
} from "@/lib/admin/admin-ui-test-session";

function resolveRedirectPath(request: NextRequest) {
  const requestedRedirect = request.nextUrl.searchParams.get("redirect") || "/admin";
  if (!requestedRedirect.startsWith("/admin")) {
    return "/admin";
  }

  if (requestedRedirect.startsWith(ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH)) {
    return "/admin";
  }

  return requestedRedirect;
}

export function GET(request: NextRequest) {
  if (!isAdminUiTestSessionRuntimeEnabled()) {
    return NextResponse.json(
      { ok: false, status: "disabled", reason: "Admin UI test session is disabled." },
      { status: 404 },
    );
  }

  const response = NextResponse.redirect(new URL(resolveRedirectPath(request), request.url));
  response.cookies.set({
    name: ADMIN_UI_TEST_SESSION_COOKIE_KEY,
    value: buildAdminUiTestSessionStorageValue(),
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 30 * 60,
  });
  return response;
}
