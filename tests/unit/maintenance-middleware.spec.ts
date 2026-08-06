import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NAV_SESSION_COOKIE } from "@/lib/navigation-session";

const originalMaintenanceMode = process.env.KANDY_MAINTENANCE_MODE;
const originalNavigationSecret = process.env.NAVIGATION_COOKIE_SECRET;

function restoreEnv(name: "KANDY_MAINTENANCE_MODE" | "NAVIGATION_COOKIE_SECRET", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function createRequest(pathname: string, sessionCookie?: string) {
  return new NextRequest(`https://kandydrops.test${pathname}`, {
    headers: sessionCookie
      ? { cookie: `${NAV_SESSION_COOKIE}=${sessionCookie}` }
      : undefined,
  });
}

describe("maintenance middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.KANDY_MAINTENANCE_MODE = "1";
    process.env.NAVIGATION_COOKIE_SECRET = "maintenance-middleware-test-secret";
  });

  afterEach(() => {
    restoreEnv("KANDY_MAINTENANCE_MODE", originalMaintenanceMode);
    restoreEnv("NAVIGATION_COOKIE_SECRET", originalNavigationSecret);
  });

  it("shows a signed admin the control-tower exit and limits maintenance bypass to admin targets", async () => {
    const navigationSession = await import("@/lib/navigation-session");
    const { middleware } = await import("../../middleware");
    const adminCookie = await navigationSession.createNavigationSessionCookieValue("admin_12345", "admin");
    const userCookie = await navigationSession.createNavigationSessionCookieValue("user_123456", "user");

    expect(adminCookie).toBeTruthy();
    expect(userCookie).toBeTruthy();

    const adminScreen = await middleware(createRequest("/", adminCookie!));
    expect(adminScreen.status).toBe(503);
    await expect(adminScreen.text()).resolves.toContain('href="/admin"');

    const adminConsole = await middleware(createRequest("/admin", adminCookie!));
    expect(adminConsole.headers.get("x-middleware-next")).toBe("1");

    const adminApi = await middleware(createRequest("/api/admin/debug", adminCookie!));
    expect(adminApi.headers.get("x-middleware-next")).toBe("1");

    const userConsole = await middleware(createRequest("/admin", userCookie!));
    expect(userConsole.status).toBe(503);
  });

  it("fails closed when the signed navigation session cannot be verified", async () => {
    delete process.env.NAVIGATION_COOKIE_SECRET;
    vi.resetModules();
    const { middleware } = await import("../../middleware");

    const response = await middleware(createRequest("/admin", "forged.admin.cookie"));
    expect(response.status).toBe(503);
  });
});
