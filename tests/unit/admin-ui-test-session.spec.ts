import { describe, expect, it } from "vitest";

import {
  ADMIN_UI_TEST_SESSION_ENV_FLAG,
  ADMIN_UI_TEST_SESSION_STORAGE_KEY,
  buildAdminUiTestSessionStorageValue,
  resolveAdminUiTestSession,
} from "@/lib/admin/admin-ui-test-session";

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

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

  it("builds a bounded ephemeral storage value for direct browser admin route audits", () => {
    const parsed = JSON.parse(buildAdminUiTestSessionStorageValue({
      nowMs: NOW,
      ttlMs: 30_000,
    })) as { enabled: boolean; role: string; expiresAt: number };

    expect(parsed.enabled).toBe(true);
    expect(parsed.role).toBe("admin");
    expect(parsed.expiresAt).toBe(NOW + 30_000);
  });
});
