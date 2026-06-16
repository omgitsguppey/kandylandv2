import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as bootstrapAdminUiTestSession } from "@/app/api/admin-ui-test-session/route";
import {
  ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH,
  ADMIN_UI_TEST_SESSION_COOKIE_KEY,
  ADMIN_UI_TEST_SESSION_ENV_FLAG,
  ADMIN_UI_TEST_SESSION_QUERY_PARAM,
  ADMIN_UI_TEST_SESSION_STORAGE_KEY,
  buildAdminUiTestSessionStorageValue,
  isAdminUiTestSessionUser,
  normalizeAdminUiTestSessionCookieValue,
  readAdminUiTestSession,
  resolveAdminUiTestSession,
} from "@/lib/admin/admin-ui-test-session";

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const authContextSource = readFileSync(join(process.cwd(), "src/context/AuthContext.tsx"), "utf8");
const rootLayoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

function session(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    enabled: true,
    role: "admin",
    uid: "admin_ui_smoke",
    email: "admin-ui-smoke@example.invalid",
    displayName: "Admin UI Smoke",
    expiresAt: NOW + 60_000,
    ...overrides,
  });
}

describe("admin UI test session", () => {
  function withWindow(input: {
    search: string;
    initialStorage?: string | null;
    storageUnavailable?: boolean;
    run: (storage: Map<string, string>) => void;
  }) {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const storage = new Map<string, string>();
    if (input.initialStorage) {
      storage.set(ADMIN_UI_TEST_SESSION_STORAGE_KEY, input.initialStorage);
    }

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          search: input.search,
        },
        localStorage: input.storageUnavailable
          ? undefined
          : {
              getItem: (key: string) => storage.get(key) ?? null,
              setItem: (key: string, value: string) => {
                storage.set(key, value);
              },
              removeItem: (key: string) => {
                storage.delete(key);
              },
            },
      },
    });

    try {
      input.run(storage);
    } finally {
      if (previousWindow) {
        Object.defineProperty(globalThis, "window", previousWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  }

  it("is hard-disabled in production even when the env flag is set", () => {
    const resolved = resolveAdminUiTestSession({
      rawValue: session(),
      nowMs: NOW,
      nodeEnv: "production",
      envFlag: "1",
    });

    expect(resolved.status).toBe("disabled");
    expect(resolved.user).toBeNull();
    expect(resolved.userProfile).toBeNull();
    expect(resolved.reason).toContain(ADMIN_UI_TEST_SESSION_ENV_FLAG);
  });

  it("requires explicit local storage when non-production fixture mode is enabled", () => {
    const resolved = resolveAdminUiTestSession({
      rawValue: null,
      nowMs: NOW,
      nodeEnv: "development",
      envFlag: "1",
    });

    expect(resolved.status).toBe("missing");
    expect(resolved.reason).toContain(ADMIN_UI_TEST_SESSION_STORAGE_KEY);
  });

  it("rejects malformed, non-admin, and expired fixture sessions", () => {
    expect(resolveAdminUiTestSession({
      rawValue: "{",
      nowMs: NOW,
      nodeEnv: "development",
      envFlag: "1",
    }).status).toBe("invalid");
    expect(resolveAdminUiTestSession({
      rawValue: session({ role: "user" }),
      nowMs: NOW,
      nodeEnv: "development",
      envFlag: "1",
    }).status).toBe("invalid");
    expect(resolveAdminUiTestSession({
      rawValue: session({ expiresAt: NOW - 1 }),
      nowMs: NOW,
      nodeEnv: "development",
      envFlag: "1",
    }).status).toBe("expired");
  });

  it("builds a local admin shell identity without issuing Firebase credentials", async () => {
    const resolved = resolveAdminUiTestSession({
      rawValue: session(),
      nowMs: NOW,
      nodeEnv: "development",
      envFlag: "1",
    });

    expect(resolved.status).toBe("ready");
    expect(resolved.user?.uid).toBe("admin_ui_smoke");
    expect(resolved.user?.providerData[0]?.providerId).toBe("admin-ui-test-session");
    expect(resolved.userProfile?.role).toBe("admin");
    expect(resolved.userProfile?.privacySettings?.consentMode).toBe("minimal_analytics");
    expect(resolved.userProfile?.privacySettings?.identifiedAnalyticsEnabled).toBe(false);
    expect(resolved.user).toBeTruthy();
    await expect(resolved.user!.getIdToken()).rejects.toThrow("cannot issue Firebase ID tokens");
  });

  it("detects the bounded local fixture identity without treating normal providers as fixtures", () => {
    expect(isAdminUiTestSessionUser({
      providerData: [{ providerId: "admin-ui-test-session" }],
    })).toBe(true);
    expect(isAdminUiTestSessionUser({
      providerData: [{ providerId: "password" }],
    })).toBe(false);
    expect(isAdminUiTestSessionUser(null)).toBe(false);
  });

  it("builds a bounded ephemeral storage value for direct browser admin route audits", () => {
    const parsed = JSON.parse(buildAdminUiTestSessionStorageValue({
      nowMs: NOW,
      ttlMs: 30_000,
    })) as { enabled: boolean; role: string; expiresAt: number };

    expect(parsed.enabled).toBe(true);
    expect(parsed.role).toBe("admin");
    expect(parsed.expiresAt).toBe(NOW + 30_000);
  });

  it("persists a bounded account-free browser fixture when the query bootstrap is used", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = "1";

    try {
      withWindow({
        search: `?${ADMIN_UI_TEST_SESSION_QUERY_PARAM}=1`,
        run: (storage) => {
          const resolved = readAdminUiTestSession();
          const storedValue = storage.get(ADMIN_UI_TEST_SESSION_STORAGE_KEY);

          expect(resolved.status).toBe("ready");
          expect(resolved.userProfile?.role).toBe("admin");
          expect(storedValue).toBeTruthy();
          expect(JSON.parse(storedValue ?? "{}")).toMatchObject({
            enabled: true,
            role: "admin",
            uid: "admin-ui-smoke",
          });
        },
      });
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("does not overwrite an existing local admin browser fixture", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = "1";
    const existingSession = buildAdminUiTestSessionStorageValue({
      uid: "existing-admin-ui-smoke",
      nowMs: Date.now(),
      ttlMs: 60_000,
    });

    try {
      withWindow({
        search: `?${ADMIN_UI_TEST_SESSION_QUERY_PARAM}=1`,
        initialStorage: existingSession,
        run: (storage) => {
          const resolved = readAdminUiTestSession();

          expect(resolved.status).toBe("ready");
          expect(resolved.user?.uid).toBe("existing-admin-ui-smoke");
          expect(storage.get(ADMIN_UI_TEST_SESSION_STORAGE_KEY)).toBe(existingSession);
        },
      });
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("refreshes an expired local fixture when the query bootstrap is requested", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = "1";
    const expiredSession = session({ uid: "expired-admin-ui-smoke", expiresAt: NOW - 1 });

    try {
      withWindow({
        search: `?${ADMIN_UI_TEST_SESSION_QUERY_PARAM}=1`,
        initialStorage: expiredSession,
        run: (storage) => {
          const resolved = readAdminUiTestSession();
          const storedValue = storage.get(ADMIN_UI_TEST_SESSION_STORAGE_KEY) ?? "";
          const stored = JSON.parse(storedValue) as { enabled?: boolean; role?: string; uid?: string; expiresAt?: number };

          expect(resolved.status).toBe("ready");
          expect(resolved.user?.uid).toBe("admin-ui-smoke");
          expect(storedValue).not.toBe(expiredSession);
          expect(stored).toMatchObject({
            enabled: true,
            role: "admin",
            uid: "admin-ui-smoke",
          });
          expect(typeof stored.expiresAt).toBe("number");
          expect(stored.expiresAt ?? 0).toBeGreaterThan(Date.now());
        },
      });
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("still resolves a query-scoped fixture when browser storage is unavailable", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = "1";

    try {
      withWindow({
        search: `?${ADMIN_UI_TEST_SESSION_QUERY_PARAM}=1`,
        storageUnavailable: true,
        run: (storage) => {
          const resolved = readAdminUiTestSession();

          expect(resolved.status).toBe("ready");
          expect(resolved.user?.uid).toBe("admin-ui-smoke");
          expect(resolved.userProfile?.role).toBe("admin");
          expect(storage.has(ADMIN_UI_TEST_SESSION_STORAGE_KEY)).toBe(false);
        },
      });
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("mints a bounded local cookie fixture and redirects only to admin paths", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = "1";

    try {
      const response = bootstrapAdminUiTestSession(
        new NextRequest(`http://localhost${ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH}?redirect=/admin/debug`),
      );
      const unsafeResponse = bootstrapAdminUiTestSession(
        new NextRequest(`http://localhost${ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH}?redirect=https://example.invalid/`),
      );

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      expect(response.headers.get("location")).toBe("http://localhost/admin/debug");
      expect(response.headers.get("set-cookie")).toContain(ADMIN_UI_TEST_SESSION_COOKIE_KEY);
      expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=lax");
      const encodedCookieValue = response.headers.get("set-cookie")?.match(/=([^;]+)/)?.[1] ?? "";
      expect(resolveAdminUiTestSession({
        rawValue: normalizeAdminUiTestSessionCookieValue(encodedCookieValue),
        nodeEnv: "development",
        envFlag: "1",
      }).status).toBe("ready");
      expect(unsafeResponse.headers.get("location")).toBe("http://localhost/admin");
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("does not expose the cookie bootstrap route when the fixture gate is disabled", () => {
    const previousEnv = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
    delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;

    try {
      const response = bootstrapAdminUiTestSession(
        new NextRequest(`http://localhost${ADMIN_UI_TEST_SESSION_BOOTSTRAP_PATH}`),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      if (previousEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION;
      } else {
        process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION = previousEnv;
      }
    }
  });

  it("supports server-provided initial fixture auth for no-account Browser audits", () => {
    expect(rootLayoutSource).toContain("readInitialAdminUiTestSessionValue");
    expect(rootLayoutSource).toContain("ADMIN_UI_TEST_SESSION_COOKIE_KEY");
    expect(rootLayoutSource).toContain("normalizeAdminUiTestSessionCookieValue");
    expect(rootLayoutSource).toContain("initialAdminUiTestSessionValue={initialAdminUiTestSessionValue}");
    expect(authContextSource).toContain("initialAdminUiTestSessionValue?: string | null");
    expect(authContextSource).toContain("resolveAdminUiTestSession({ rawValue: initialAdminUiTestSessionValue })");
    expect(authContextSource).toContain("if (initialAdminUiTestSessionReady) {\n            return;\n        }");
  });

  it("does not attempt server navigation-session sync with the local UI test identity", () => {
    const navigationSyncEffect = authContextSource.slice(
      authContextSource.indexOf("useEffect(() => {\n        if (!user)"),
      authContextSource.indexOf("const signInWithGoogle"),
    );

    expect(navigationSyncEffect).toContain("if (adminUiTestSessionActive) {");
    expect(navigationSyncEffect).toContain("navigationSessionSyncKeyRef.current = null;");
    expect(navigationSyncEffect).toContain("authFetch(\"/api/auth/navigation-session\"");
    expect(navigationSyncEffect.indexOf("if (adminUiTestSessionActive) {")).toBeLessThan(
      navigationSyncEffect.indexOf("authFetch(\"/api/auth/navigation-session\""),
    );
  });
});
