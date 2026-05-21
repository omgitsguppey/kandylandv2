import { describe, expect, it } from "vitest";

import {
  CONSENT_MODE_VALUES,
  CONSENT_TRACKING_STORAGE_KEYS,
  CONSENT_TRACKING_VERSION,
} from "@/lib/privacy/consent-tracking-contract";
import {
  canPersistIdentityLink,
  canTrackEvent,
  canUseBehavioralSignals,
  canUseExternalAnalytics,
  getConsentTelemetryReason,
  getConsentUpgradeEffect,
  resolveConsentMode,
} from "@/lib/privacy/consent-tracking-policy";

describe("consent tracking contract", () => {
  it("defines versioned consent modes and storage keys", () => {
    expect(CONSENT_TRACKING_VERSION).toMatch(/^2026-05-/u);
    expect(CONSENT_MODE_VALUES).toEqual([
      "unknown",
      "necessary_only",
      "minimal_analytics",
      "full_analytics",
      "full_behavioral",
    ]);
    expect(CONSENT_TRACKING_STORAGE_KEYS.localStorage).toBe("kandydrops.privacy.settings");
    expect(CONSENT_TRACKING_STORAGE_KEYS.cookie).toBe("kandydrops_analytics_consent");
  });

  it("maps banner decisions to actual tracking capability changes", () => {
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
  });

  it("defaults unknown consent to necessary-only behavior until a decision exists", () => {
    expect(resolveConsentMode({ consentUpdatedAt: 0 })).toBe("unknown");
    expect(canTrackEvent("semantic_page_viewed", "unknown")).toBe(false);
    expect(canTrackEvent("auth_sign_in_failed", "unknown")).toBe(true);
    expect(getConsentTelemetryReason("semantic_page_viewed", "unknown")).toBe("blocked_until_consent_decision");
  });

  it("allows minimal analytics without full behavioral or external analytics", () => {
    expect(canTrackEvent("page_viewed", "minimal_analytics")).toBe(true);
    expect(canTrackEvent("semantic_page_viewed", "minimal_analytics")).toBe(false);
    expect(canTrackEvent("drop_card_impression", "minimal_analytics")).toBe(false);
    expect(canUseBehavioralSignals("minimal_analytics")).toBe(false);
    expect(canUseExternalAnalytics("minimal_analytics")).toBe(false);
  });

  it("keeps required integrity events available under decline", () => {
    expect(canTrackEvent("security_rate_limit_triggered", "necessary_only")).toBe(true);
    expect(canTrackEvent("auth_sign_in_attempted", "necessary_only")).toBe(true);
    expect(canTrackEvent("paypal_capture_completed", "necessary_only")).toBe(true);
    expect(canTrackEvent("gumdrop_balance_reconciled", "necessary_only")).toBe(true);
    expect(canTrackEvent("creator_profile_viewed", "necessary_only")).toBe(false);
  });

  it("requires full behavioral consent for identity persistence and behavior signals", () => {
    expect(canPersistIdentityLink("minimal_analytics")).toBe(false);
    expect(canPersistIdentityLink("full_analytics")).toBe(true);
    expect(canUseBehavioralSignals("full_analytics")).toBe(false);
    expect(canUseBehavioralSignals("full_behavioral")).toBe(true);
    expect(canTrackEvent("semantic_target_clicked", "full_behavioral")).toBe(true);
  });
});
