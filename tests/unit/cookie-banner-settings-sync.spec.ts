import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRIVACY_SETTINGS,
  buildAccountPrivacySettingsFromConsentSnapshot,
  normalizePrivacySettingsSnapshot,
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
    const guestMinimal = {
      ...DEFAULT_PRIVACY_SETTINGS,
      consentMode: "minimal_analytics" as const,
      consentDecision: "minimal" as const,
      consentSource: "banner" as const,
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: false,
      allowRecommendations: false,
      showInAnonymousStats: true,
      consentUpdatedAt: 1700000000001,
    };

    expect(shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 0 })).toBe(true);
    expect(shouldSyncGuestConsentToAccount(guestFull, { consentUpdatedAt: 1690000000000 })).toBe(false);
    expect(shouldSyncGuestConsentToAccount(guestMinimal, undefined)).toBe(true);
    expect(shouldSyncGuestConsentToAccount(DEFAULT_PRIVACY_SETTINGS, { consentUpdatedAt: 0 })).toBe(false);
    expect(buildAccountPrivacySettingsFromConsentSnapshot(guestFull)).toMatchObject({
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      allowRecommendations: true,
      showInAnonymousStats: true,
      honorGlobalPrivacyControl: true,
      consentUpdatedAt: 1700000000000,
    });
    expect(buildAccountPrivacySettingsFromConsentSnapshot(guestMinimal)).toMatchObject({
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: false,
      allowRecommendations: false,
      showInAnonymousStats: true,
      honorGlobalPrivacyControl: true,
      consentUpdatedAt: 1700000000001,
    });
  });

  it("keeps default and malformed consent timestamps non-explicit so the banner can show", () => {
    expect(DEFAULT_PRIVACY_SETTINGS.consentUpdatedAt).toBe(0);
    expect(normalizePrivacySettingsSnapshot(null).consentUpdatedAt).toBe(0);
    expect(normalizePrivacySettingsSnapshot({ consentUpdatedAt: "bad" as never }).consentUpdatedAt).toBe(0);
    expect(shouldSyncGuestConsentToAccount(normalizePrivacySettingsSnapshot(null), undefined)).toBe(false);
  });

  it("treats real banner and account timestamps as explicit consent", () => {
    const accepted = normalizePrivacySettingsSnapshot({
      consentDecision: "accept_all",
      consentSource: "banner",
      consentMode: "full_behavioral",
      anonymousAnalyticsEnabled: true,
      identifiedAnalyticsEnabled: true,
      allowRecommendations: true,
      showInAnonymousStats: true,
      consentUpdatedAt: 1700000000002,
    });

    expect(accepted.consentUpdatedAt).toBeGreaterThan(0);
    expect(shouldSyncGuestConsentToAccount(accepted, undefined)).toBe(true);
    expect(shouldSyncGuestConsentToAccount(accepted, { consentUpdatedAt: 1700000000001 })).toBe(false);
  });

  it("wires account preference sync in auth handoff without touching nav or chat", () => {
    const authContext = read("src/context/AuthContext.tsx");

    expect(authContext).toContain("syncGuestConsentIntoAccountProfile");
    expect(authContext).toContain("shouldSyncGuestConsentToAccount");
    expect(authContext).toContain("buildAccountPrivacySettingsFromConsentSnapshot");
    expect(authContext).toContain("/api/user/profile");
    expect(authContext).toContain("account_settings");
    expect(authContext).toContain("setUserProfile(profile)");

    const changedFilesValidator = read("scripts/agent/validate-cookie-banner-settings-sync.ts");
    expect(changedFilesValidator).toContain("protectedChanges");
    expect(changedFilesValidator).toContain("Navigation");
    expect(changedFilesValidator).toContain("chat");
  });
});
