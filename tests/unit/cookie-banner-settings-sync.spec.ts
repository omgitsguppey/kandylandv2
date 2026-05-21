import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRIVACY_SETTINGS,
  buildAccountPrivacySettingsFromConsentSnapshot,
  shouldSyncGuestConsentToAccount,
} from "@/lib/privacy-consent";
import {
  canUseBehavioralSignals,
  getConsentUpgradeEffect,
} from "@/lib/privacy/consent-tracking-policy";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("cookie banner mobile UX and settings sync", () => {
  it("keeps the mobile banner compact, readable, and connected to tracking modes", () => {
    const banner = read("src/components/CookieBanner.tsx");

    expect(banner).toContain('data-cookie-banner-mobile={isCompactViewport ? "compact" : "standard"}');
    expect(banner).toContain('data-consent-tracking-connected="true"');
    expect(banner).toContain("overflow-y-auto");
    expect(banner).toContain("env(safe-area-inset-bottom)");
    expect(banner).toContain("text-xs");
    expect(banner).toContain("text-sm");
    expect(banner).toContain("Accept all");
    expect(banner).toContain("Minimal analytics");
    expect(banner).toContain("Decline optional");
    expect(banner).toContain("Manage settings");
    expect(banner).not.toMatch(/\btruncate\b/u);
  });

  it("maps banner choices to consent modes instead of just hiding the banner", () => {
    expect(getConsentUpgradeEffect("accept_all")).toMatchObject({
      consentMode: "full_behavioral",
      enablesBehavioralTracking: true,
      enablesExternalAnalytics: true,
    });
    expect(getConsentUpgradeEffect("minimal")).toMatchObject({
      consentMode: "minimal_analytics",
      enablesBehavioralTracking: false,
      enablesExternalAnalytics: false,
    });
    expect(getConsentUpgradeEffect("decline_optional")).toMatchObject({
      consentMode: "necessary_only",
      enablesBehavioralTracking: false,
      enablesExternalAnalytics: false,
    });
    expect(canUseBehavioralSignals("minimal_analytics")).toBe(false);
    expect(canUseBehavioralSignals("necessary_only")).toBe(false);
  });

  it("syncs guest consent to account privacy only when the account has no explicit preference", () => {
    const guestFull = {
      ...DEFAULT_PRIVACY_SETTINGS,
      consentMode: "full_behavioral" as const,
      consentDecision: "accept_all" as const,
      consentSource: "banner" as const,
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      allowRecommendations: true,
      showInAnonymousStats: true,
      consentUpdatedAt: 1700000000000,
    };

    expect(shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 0 })).toBe(true);
    expect(shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 1690000000000 })).toBe(false);
    expect(shouldSyncGuestConsentToAccount(DEFAULT_PRIVACY_SETTINGS, { consentUpdatedAt: 0 })).toBe(false);
    expect(buildAccountPrivacySettingsFromConsentSnapshot(guestFull)).toMatchObject({
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      allowRecommendations: true,
      showInAnonymousStats: true,
      honorGlobalPrivacyControl: true,
      consentUpdatedAt: 1700000000000,
    });
  });

  it("wires account preference sync in the app shell without touching nav or chat", () => {
    const coreLayout = read("src/components/CoreLayoutWrapper.tsx");

    expect(coreLayout).toContain("shouldSyncGuestConsentToAccount");
    expect(coreLayout).toContain("buildAccountPrivacySettingsFromConsentSnapshot");
    expect(coreLayout).toContain("/api/user/profile");
    expect(coreLayout).toContain("account_settings");

    const changedFilesValidator = read("scripts/agent/validate-cookie-banner-settings-sync.ts");
    expect(changedFilesValidator).toContain("protectedChanges");
    expect(changedFilesValidator).toContain("Navigation");
    expect(changedFilesValidator).toContain("chat");
  });
});
