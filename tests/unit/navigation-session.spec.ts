import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("navigation-session", () => {
  const originalNavigationSecret = process.env.NAVIGATION_COOKIE_SECRET;
  const originalFirebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  beforeEach(() => {
    vi.resetModules();
    process.env.NAVIGATION_COOKIE_SECRET = "test-navigation-secret";
    process.env.FIREBASE_PRIVATE_KEY = "firebase-private-key-should-not-be-used";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    if (originalNavigationSecret === undefined) {
      delete process.env.NAVIGATION_COOKIE_SECRET;
    } else {
      process.env.NAVIGATION_COOKIE_SECRET = originalNavigationSecret;
    }

    if (originalFirebasePrivateKey === undefined) {
      delete process.env.FIREBASE_PRIVATE_KEY;
    } else {
      process.env.FIREBASE_PRIVATE_KEY = originalFirebasePrivateKey;
    }
  });

  it("creates and verifies a navigation session cookie when NAVIGATION_COOKIE_SECRET is set", async () => {
    const navigationSession = await import("@/lib/navigation-session");

    const cookieValue = await navigationSession.createNavigationSessionCookieValue(
      "user_12345",
      "admin",
      "default",
    );

    if (!cookieValue) {
      throw new Error("Expected a navigation session cookie to be created.");
    }

    await expect(navigationSession.verifyNavigationSessionCookieValue(cookieValue)).resolves.toMatchObject({
      uid: "user_12345",
      role: "admin",
      state: "default",
    });
  });

  it("creates and verifies a short-lived maintenance admin ticket", async () => {
    const navigationSession = await import("@/lib/navigation-session");

    const ticket = await navigationSession.createMaintenanceAdminSessionCookieValue("admin_12345");

    if (!ticket) {
      throw new Error("Expected a maintenance ticket to be created.");
    }

    await expect(navigationSession.verifyMaintenanceAdminSessionCookieValue(ticket)).resolves.toMatchObject({
      uid: "admin_12345",
    });
  });

  it("does not allow normal navigation sessions and maintenance tickets to substitute for each other", async () => {
    const navigationSession = await import("@/lib/navigation-session");

    const navigationCookie = await navigationSession.createNavigationSessionCookieValue(
      "admin_12345",
      "admin",
      "default",
    );
    const maintenanceTicket = await navigationSession.createMaintenanceAdminSessionCookieValue("admin_12345");

    if (!navigationCookie || !maintenanceTicket) {
      throw new Error("Expected both session credentials to be created.");
    }

    await expect(
      navigationSession.verifyMaintenanceAdminSessionCookieValue(navigationCookie),
    ).resolves.toBeNull();
    await expect(navigationSession.verifyNavigationSessionCookieValue(maintenanceTicket)).resolves.toBeNull();
  });

  it("rejects a noncanonical maintenance admin ticket signature", async () => {
    const navigationSession = await import("@/lib/navigation-session");

    const ticket = await navigationSession.createMaintenanceAdminSessionCookieValue("admin_12345");
    if (!ticket) {
      throw new Error("Expected a maintenance ticket to be created.");
    }

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const finalCharacter = ticket[ticket.length - 1] ?? "";
    const finalCharacterIndex = alphabet.indexOf(finalCharacter);
    if (finalCharacterIndex < 0 || finalCharacterIndex % 4 !== 0) {
      throw new Error("Expected a canonical Base64URL signature.");
    }

    const tamperedTicket = ticket.slice(0, -1) + alphabet[finalCharacterIndex + 1];

    await expect(navigationSession.verifyMaintenanceAdminSessionCookieValue(tamperedTicket)).resolves.toBeNull();
  });

  it("rejects an expired maintenance admin ticket", async () => {
    const navigationSession = await import("@/lib/navigation-session");
    const now = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    const ticket = await navigationSession.createMaintenanceAdminSessionCookieValue("admin_12345");
    if (!ticket) {
      throw new Error("Expected a maintenance ticket to be created.");
    }

    nowSpy.mockReturnValue(now + (navigationSession.MAINTENANCE_ADMIN_SESSION_MAX_AGE_SECONDS * 1000) + 1);

    await expect(navigationSession.verifyMaintenanceAdminSessionCookieValue(ticket)).resolves.toBeNull();
  });

  it("fails closed when NAVIGATION_COOKIE_SECRET is missing even if FIREBASE_PRIVATE_KEY exists", async () => {
    delete process.env.NAVIGATION_COOKIE_SECRET;

    const navigationSession = await import("@/lib/navigation-session");

    await expect(navigationSession.createNavigationSessionCookieValue("user_12345", "user", "default")).resolves.toBeNull();
    await expect(navigationSession.verifyNavigationSessionCookieValue("invalid.cookie")).resolves.toBeNull();
    await expect(navigationSession.createMaintenanceAdminSessionCookieValue("admin_12345")).resolves.toBeNull();
    await expect(navigationSession.verifyMaintenanceAdminSessionCookieValue("invalid.cookie")).resolves.toBeNull();
  });
});
