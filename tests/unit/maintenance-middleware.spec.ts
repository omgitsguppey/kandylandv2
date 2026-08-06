import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isMaintenanceModeEnabledMock,
  verifyMaintenanceAdminSessionCookieValueMock,
  verifyNavigationSessionCookieValueMock,
} = vi.hoisted(() => ({
  isMaintenanceModeEnabledMock: vi.fn(),
  verifyMaintenanceAdminSessionCookieValueMock: vi.fn(),
  verifyNavigationSessionCookieValueMock: vi.fn(),
}));

vi.mock("@/lib/maintenance-mode", () => ({
  isMaintenanceModeEnabled: isMaintenanceModeEnabledMock,
}));

vi.mock("@/lib/navigation-session", () => ({
  MAINTENANCE_ADMIN_SESSION_COOKIE: "kandydrops_maintenance_admin",
  NAV_SESSION_COOKIE: "kandydrops_nav_session",
  verifyMaintenanceAdminSessionCookieValue: verifyMaintenanceAdminSessionCookieValueMock,
  verifyNavigationSessionCookieValue: verifyNavigationSessionCookieValueMock,
}));

import { middleware } from "../../middleware";

function request(pathname: string, cookie?: string, method = "GET"): NextRequest {
  return new NextRequest("https://kandydrops.test" + pathname, {
    method,
    headers: cookie ? { cookie } : undefined,
  });
}

function expectNext(response: Response) {
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

describe("maintenance middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMaintenanceModeEnabledMock.mockReturnValue(true);
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue(null);
    verifyNavigationSessionCookieValueMock.mockResolvedValue(null);
  });

  it("preserves normal routing when maintenance is disabled", async () => {
    isMaintenanceModeEnabledMock.mockReturnValue(false);

    expectNext(await middleware(request("/drops")));
  });

  it("serves the public gate with an always-visible admin recovery link", async () => {
    const response = await middleware(request("/drops/featured"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toContain('href="/maintenance/admin"');
  });

  it("allows only the exact maintenance bootstrap requests without a ticket", async () => {
    expectNext(await middleware(request("/maintenance/admin")));
    expectNext(await middleware(request("/api/auth/navigation-session", undefined, "POST")));

    expect((await middleware(request("/api/auth/navigation-session"))).status).toBe(503);
    expect((await middleware(request("/api/auth/navigation-session-extra", undefined, "POST"))).status).toBe(503);
  });

  it("does not accept the old long-lived navigation cookie", async () => {
    const response = await middleware(request("/admin", "kandydrops_nav_session=legacy-admin-session"));

    expect(response.status).toBe(503);
    expect(verifyMaintenanceAdminSessionCookieValueMock).toHaveBeenCalledWith(undefined);
  });

  it("allows a valid short-lived ticket only to reviewed administrator paths", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue({
      uid: "admin-user",
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    expectNext(await middleware(request("/admin/debug", "kandydrops_maintenance_admin=valid-ticket")));
    expectNext(await middleware(request("/api/admin/debug", "kandydrops_maintenance_admin=valid-ticket")));
    expectNext(
      await middleware(request("/api/drops/duplicate-filenames", "kandydrops_maintenance_admin=valid-ticket")),
    );

    expect((await middleware(request("/api/users/me", "kandydrops_maintenance_admin=valid-ticket"))).status).toBe(503);
    expect((await middleware(request("/api/administrator/debug", "kandydrops_maintenance_admin=valid-ticket"))).status).toBe(503);
  });

  it("fails closed for invalid or expired maintenance tickets", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue(null);

    expect((await middleware(request("/admin", "kandydrops_maintenance_admin=expired-ticket"))).status).toBe(503);
    expect((await middleware(request("/api/admin/debug", "kandydrops_maintenance_admin=expired-ticket"))).status).toBe(503);
  });
});