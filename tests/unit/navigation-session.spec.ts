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

    expect(cookieValue).toBeTruthy();
    await expect(navigationSession.verifyNavigationSessionCookieValue(cookieValue)).resolves.toMatchObject({
      uid: "user_12345",
      role: "admin",
      state: "default",
    });
  });

  it("fails closed when NAVIGATION_COOKIE_SECRET is missing even if FIREBASE_PRIVATE_KEY exists", async () => {
    delete process.env.NAVIGATION_COOKIE_SECRET;

    const navigationSession = await import("@/lib/navigation-session");

    await expect(navigationSession.createNavigationSessionCookieValue("user_12345", "user", "default")).resolves.toBeNull();
    await expect(navigationSession.verifyNavigationSessionCookieValue("invalid.cookie")).resolves.toBeNull();
  });
});
