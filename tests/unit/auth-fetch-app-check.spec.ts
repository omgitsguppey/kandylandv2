import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveAppCheckClientReadiness } from "@/lib/authFetch";
import { APP_CHECK_READINESS_CONTRACT } from "@/lib/server/security-hardening-contract";

describe("authFetch App Check source readiness", () => {
  it("enables token acquisition only when every off-by-default client prerequisite is present", () => {
    expect(resolveAppCheckClientReadiness({
      mode: "token",
      siteKey: "public-site-key",
      browserAvailable: true,
      firebaseConfigured: true,
    })).toEqual({ enabled: true, reason: "ready" });

    expect(resolveAppCheckClientReadiness({
      mode: "off",
      siteKey: "public-site-key",
      browserAvailable: true,
      firebaseConfigured: true,
    })).toEqual({ enabled: false, reason: "off" });
    expect(resolveAppCheckClientReadiness({
      mode: "token",
      siteKey: "",
      browserAvailable: true,
      firebaseConfigured: true,
    })).toEqual({ enabled: false, reason: "site_key_missing" });
    expect(resolveAppCheckClientReadiness({
      mode: "token",
      siteKey: "public-site-key",
      browserAvailable: false,
      firebaseConfigured: true,
    })).toEqual({ enabled: false, reason: "browser_unavailable" });
  });

  it("keeps the source path standard, fail-open, and distinct from unproven server enforcement", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/authFetch.ts"), "utf8");

    expect(source).toContain('import("firebase/app-check")');
    expect(source).toContain('headers.set("X-Firebase-AppCheck", appCheckToken)');
    expect(source).toContain("isTokenAutoRefreshEnabled: false");
    expect(source).toContain("request continuing in source-ready fail-open mode");
    expect(APP_CHECK_READINESS_CONTRACT.enabledClientSide).toBe(false);
    expect(APP_CHECK_READINESS_CONTRACT.sendsTokenToCustomBackend).toBe(false);
    expect(APP_CHECK_READINESS_CONTRACT.serverVerifiesToken).toBe(false);
    expect(APP_CHECK_READINESS_CONTRACT.enforcementMode).toBe("off");
  });
});
