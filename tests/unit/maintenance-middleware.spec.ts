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
import { resolveMaintenanceAdminReturnPath } from "../../shared/runtime/maintenance-mode-contract";

describe("maintenance return destinations", () => {
  it("preserves internal page queries and strips fragments", () => {
    expect(resolveMaintenanceAdminReturnPath("/drops?sort=recent#cover")).toBe("/drops?sort=recent");
    expect(resolveMaintenanceAdminReturnPath("/admin/users?query=hello%20world")).toBe("/admin/users?query=hello%20world");
    expect(resolveMaintenanceAdminReturnPath("/")).toBe("/");
  });
  it.each([null, undefined, "", "https://other.test", "//other.test", "/\\other.test", "/%2fother.test", "/%5cother.test", "/%252fother.test", "/%00", "/%7f", "/%", "/api", "/api/paypal/create", "/maintenance/admin?next=/drops", "/a/../maintenance/admin", "/a/../api/admin", "/drops\n"])('rejects unsafe or looping destination %s', (value) => {
    expect(resolveMaintenanceAdminReturnPath(value)).toBe("/admin");
  });
});

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
    expectNext(await middleware(request("/api/auth/navigation-session", undefined, "DELETE")));

    expect((await middleware(request("/api/auth/navigation-session"))).status).toBe(503);
    expect((await middleware(request("/api/auth/navigation-session-extra", undefined, "POST"))).status).toBe(503);
  });

  it("does not accept the old long-lived navigation cookie", async () => {
    const response = await middleware(request("/admin", "kandydrops_nav_session=legacy-admin-session"));

    expect(response.status).toBe(503);
    expect(verifyMaintenanceAdminSessionCookieValueMock).toHaveBeenCalledWith(undefined);
  });

  it("allows a valid short-lived ticket to admin repair paths and reviewed site reads", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue({
      uid: "admin-user",
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    expectNext(await middleware(request("/admin/debug", "kandydrops_maintenance_admin=valid-ticket")));
    expectNext(await middleware(request("/api/admin/debug", "kandydrops_maintenance_admin=valid-ticket")));
    expectNext(
      await middleware(request("/api/drops/duplicate-filenames", "kandydrops_maintenance_admin=valid-ticket")),
    );

    expectNext(await middleware(request("/api/admin/analytics/refresh", "kandydrops_maintenance_admin=valid-ticket")));
    expect((await middleware(request("/api/admin/analytics/refresh", "kandydrops_maintenance_admin=valid-ticket", "POST"))).status).toBe(503);
    expect(
      (await middleware(request("/api/admin/analytics/realtime", "kandydrops_maintenance_admin=valid-ticket"))).status,
    ).toBe(503);
    expect(
      (await middleware(request("/api/admin/ai/drop-covers/generate", "kandydrops_maintenance_admin=valid-ticket"))).status,
    ).toBe(503);
    expect((await middleware(request("/api/users/me", "kandydrops_maintenance_admin=valid-ticket"))).status).toBe(503);
    expect((await middleware(request("/api/administrator/debug", "kandydrops_maintenance_admin=valid-ticket"))).status).toBe(503);
  });

  it("allows admin page navigation and reload without opening public or mutation traffic", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue({ uid: "admin-user", expiresAt: Date.now() + 900_000 });
    const cookie = "kandydrops_maintenance_admin=valid-ticket";
    for (const path of ["/", "/drops", "/experiences", "/dashboard", "/dashboard/settings", "/creators/example"]) {
      const response = await middleware(request(path, cookie));
      expectNext(response);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Cookie");
      expectNext(await middleware(request(path, cookie)));
      expect((await middleware(request(path, cookie, "POST"))).status).toBe(503);
    }
    for (const path of ["/api/drops", "/api/user/profile", "/api/notifications", "/api/chat/threads/thread_1", "/api/wallet/packages", "/api/creators/example"]) {
      expectNext(await middleware(request(path, cookie)));
      expect((await middleware(request(path, cookie, "POST"))).status).toBe(503);
    }
    for (const path of ["/api/paypal/create", "/api/paypal/capture", "/api/cron/process-queue", "/api/internal/analytics/materialize-user-index", "/api/drops/unlock", "/api/drops/content", "/api/drops-extra", "/api/chat/threads/thread_1/messages", "/api/creators/example/settings", "/api/creators"] ) {
      expect((await middleware(request(path, cookie))).status).toBe(503);
      expect((await middleware(request(path, cookie, "POST"))).status).toBe(503);
    }
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue(null);
    for (const path of ["/", "/drops", "/api/drops", "/api/user/profile"]) {
      expect((await middleware(request(path))).status).toBe(503);
    }
  });

  it("serves only the exact public brand assets during maintenance", async () => {
    expectNext(await middleware(request("/candy-main.svg")));
    expectNext(await middleware(request("/logo-k-monogram.png")));
    expectNext(await middleware(request("/logo-k-monogram.png", undefined, "HEAD")));
    expectNext(await middleware(request("/icon-192x192.png", undefined, "HEAD")));
    expect((await middleware(request("/candy-main.svg", undefined, "POST"))).status).toBe(503);
    expect((await middleware(request("/logo-k-monogram.png", undefined, "POST"))).status).toBe(503);
    for (const path of ["/api/private.svg", "/private.svg", "/candy-main.svg/extra", "/logo-k-monogram.png/extra", "/private.png", "/logo-k-monogram-extra.png"]) {
      expect((await middleware(request(path))).status).toBe(503);
    }
  });

  it("enforces the real ticket signature at the browsing boundary", async () => {
    vi.stubEnv("NAVIGATION_COOKIE_SECRET", "source-only-maintenance-signature-fixture");
    const actual = await vi.importActual<typeof import("@/lib/navigation-session")>("@/lib/navigation-session");
    verifyMaintenanceAdminSessionCookieValueMock.mockImplementation(actual.verifyMaintenanceAdminSessionCookieValue);
    const ticket = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
    expectNext(await middleware(request("/drops", `kandydrops_maintenance_admin=${ticket}`)));
    expect((await middleware(request("/drops", `kandydrops_maintenance_admin=${ticket}tampered`))).status).toBe(503);
    const userTicket = await actual.createNavigationSessionCookieValue("user_12345", "user");
    expect((await middleware(request("/drops", `kandydrops_maintenance_admin=${userTicket}`))).status).toBe(503);
    vi.unstubAllEnvs();
  });

  it("fails closed for invalid or expired maintenance tickets", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue(null);

    expect((await middleware(request("/admin", "kandydrops_maintenance_admin=expired-ticket"))).status).toBe(503);
    expect((await middleware(request("/api/admin/debug", "kandydrops_maintenance_admin=expired-ticket"))).status).toBe(503);
  });

  it("recovers a real expired admin ticket through re-verification and retains the intended page", async () => {
    vi.stubEnv("NAVIGATION_COOKIE_SECRET", "source-only-maintenance-signature-fixture");
    const actual = await vi.importActual<typeof import("@/lib/navigation-session")>("@/lib/navigation-session");
    verifyMaintenanceAdminSessionCookieValueMock.mockImplementation(actual.verifyMaintenanceAdminSessionCookieValue);
    verifyNavigationSessionCookieValueMock.mockImplementation(actual.verifyNavigationSessionCookieValue);
    const issuedAt = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(issuedAt);
    try {
      const oldTicket = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
      const navigation = await actual.createNavigationSessionCookieValue("admin_12345", "admin");
      clock.mockReturnValue(issuedAt + 16 * 60 * 1000);
      const cookies = `kandydrops_maintenance_admin=${oldTicket}; kandydrops_nav_session=${navigation}`;
      const response = await middleware(request("/admin/analytics?range=7d", cookies));
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/maintenance/admin");
      expect(location.searchParams.get("next")).toBe("/admin/analytics?range=7d");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Cookie");
      const freshTicket = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
      expectNext(await middleware(request("/admin/analytics?range=7d", `kandydrops_maintenance_admin=${freshTicket}`)));
      expectNext(await middleware(request("/admin/analytics?range=7d", `kandydrops_maintenance_admin=${freshTicket}`)));
      for (const path of ["/api/admin/debug", "/api/drops", "/api/admin/analytics/realtime", "/api/paypal/create"]) {
        expect((await middleware(request(path, cookies))).status).toBe(503);
      }
      expect((await middleware(request("/drops", cookies, "POST"))).status).toBe(503);
      expect((await middleware(request("/drops", cookies, "HEAD"))).status).toBe(503);
      const memberNavigation = await actual.createNavigationSessionCookieValue("member_12345", "user");
      expect((await middleware(request("/drops", `kandydrops_nav_session=${memberNavigation}`))).status).toBe(503);
      expect((await middleware(request("/drops", `kandydrops_nav_session=${navigation}tampered`))).status).toBe(503);
    } finally {
      clock.mockRestore();
      vi.unstubAllEnvs();
    }
  });
  it("admits the exact stored snapshot GET through a real short-lived maintenance signature", async () => {
    vi.stubEnv("NAVIGATION_COOKIE_SECRET", "source-only-maintenance-snapshot-signature-fixture");
    try {
      const actual = await vi.importActual<typeof import("@/lib/navigation-session")>("@/lib/navigation-session");
      verifyMaintenanceAdminSessionCookieValueMock.mockImplementation(actual.verifyMaintenanceAdminSessionCookieValue);
      const ticket = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
      const cookie = `kandydrops_maintenance_admin=${ticket}`;
      const url = "/api/admin/analytics/refresh?moduleKey=audience_snapshot&rangeKey=24h&force=true";
      const response = await middleware(request(url,cookie));
      expectNext(response);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toBe("Cookie");
      expect(verifyMaintenanceAdminSessionCookieValueMock).toHaveBeenCalledWith(ticket);
      expect(verifyNavigationSessionCookieValueMock).not.toHaveBeenCalled();
      expectNext(await middleware(request(url,cookie)));
    } finally { vi.unstubAllEnvs(); }
  });

  it.each(["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("blocks snapshot %s before ticket verification", async method => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue({uid:"admin_12345",expiresAt:Date.now()+900_000});
    const response = await middleware(request("/api/admin/analytics/refresh", "kandydrops_maintenance_admin=valid-ticket",method));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(verifyMaintenanceAdminSessionCookieValueMock).not.toHaveBeenCalled();
  });

  it.each(["missing", "tampered", "navigation_admin", "navigation_user", "expired"])("rejects %s identity at the snapshot GET ticket boundary", async variant => {
    vi.stubEnv("NAVIGATION_COOKIE_SECRET", "source-only-maintenance-snapshot-signature-fixture");
    const issuedAt = Date.now();
    const clock = vi.spyOn(Date,"now").mockReturnValue(issuedAt);
    try {
      const actual = await vi.importActual<typeof import("@/lib/navigation-session")>("@/lib/navigation-session");
      verifyMaintenanceAdminSessionCookieValueMock.mockImplementation(actual.verifyMaintenanceAdminSessionCookieValue);
      let ticket = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
      if (variant === "missing") ticket = null;
      if (variant === "tampered") ticket += "tampered";
      if (variant === "navigation_admin") ticket = await actual.createNavigationSessionCookieValue("admin_12345","admin");
      if (variant === "navigation_user") ticket = await actual.createNavigationSessionCookieValue("member_12345","user");
      if (variant === "expired") clock.mockReturnValue(issuedAt + 16*60*1000);
      const response = await middleware(request("/api/admin/analytics/refresh",ticket ? `kandydrops_maintenance_admin=${ticket}` : undefined));
      expect(response.status).toBe(503);
      expect(response.headers.get("x-middleware-next")).toBeNull();
      expect(verifyMaintenanceAdminSessionCookieValueMock).toHaveBeenCalledWith(ticket ?? undefined);
      expect(verifyNavigationSessionCookieValueMock).not.toHaveBeenCalled();
      const renewed = await actual.createMaintenanceAdminSessionCookieValue("admin_12345");
      expectNext(await middleware(request("/api/admin/analytics/refresh",`kandydrops_maintenance_admin=${renewed}`)));
    } finally { clock.mockRestore(); vi.unstubAllEnvs(); }
  });

  it("retains exact path and expensive analytics/AI boundaries with a valid ticket", async () => {
    verifyMaintenanceAdminSessionCookieValueMock.mockResolvedValue({uid:"admin_12345",expiresAt:Date.now()+900_000});
    for (const path of ["/api/admin/analytics", "/api/admin/analytics/refresh/", "/api/admin/analytics/refresh-extra", "/api/admin/analytics/refresh/raw", "/api/admin/analytics/raw", "/api/admin/analytics/events", "/api/admin/analytics/realtime", "/api/admin/analytics/live", "/api/admin/ai/drop-covers/generate", "/api/admin/debug/assistant/message", "/api/internal/analytics/materialize-user-index"]) {
      for (const method of ["GET","POST"]) {
        const response = await middleware(request(path,"kandydrops_maintenance_admin=valid-ticket",method));
        expect(response.status,path+" "+method).toBe(503);
        expect(response.headers.get("x-middleware-next")).toBeNull();
      }
    }
    expect(verifyMaintenanceAdminSessionCookieValueMock).not.toHaveBeenCalled();
  });

});
