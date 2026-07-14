import { describe, expect, it } from "vitest";

import {
  CREATOR_SETTINGS_ADMIN_ONLY_FIELDS,
  buildCreatorSettingsCompletion,
  buildCreatorSettingsControlPlane,
  pickCreatorSettingsControlPlaneSection,
  sanitizeCreatorSettingsControlPlaneUpdate,
  stripAdminOnlyCreatorSettingsFields,
} from "@/lib/creator-settings/creator-settings-contract";
import { CREATOR_SUBSCRIPTION_MIN_GD, DEFAULT_CREATOR_SETTINGS } from "@/lib/creator-experiences";

describe("creator settings control plane contract", () => {
  it("picks only fields owned by the selected save section", () => {
    const settings = buildCreatorSettingsControlPlane(null, {
      displayName: "Creator",
      bio: "Bio",
      photoURL: "https://example.com/photo.jpg",
    });

    expect(pickCreatorSettingsControlPlaneSection(settings, "profile_basics")).toEqual({
      profileDisplayName: "Creator",
      bio: "Bio",
      profilePhotoURL: "https://example.com/photo.jpg",
    });
    expect(pickCreatorSettingsControlPlaneSection(settings, "fan_pass")).toEqual({
      fanPassEnabled: settings.fanPassEnabled,
      fanPassPriceGd: settings.fanPassPriceGd,
      fanPassWelcomeText: settings.fanPassWelcomeText,
    });
  });

  it("turns a missing settings document into safe defaults and a setup checklist", () => {
    const controlPlane = buildCreatorSettingsControlPlane(null, {
      displayName: "",
      bio: "",
      photoURL: null,
    });
    const completion = buildCreatorSettingsCompletion(controlPlane, "not_configured");

    expect(controlPlane.fanPassEnabled).toBe(DEFAULT_CREATOR_SETTINGS.subscriptionsEnabled);
    expect(controlPlane.fanPassPriceGd).toBe(CREATOR_SUBSCRIPTION_MIN_GD);
    expect(completion.missingSetupItems).toEqual(
      expect.arrayContaining(["profile_basics", "fan_pass", "gumdrop_experiences", "broadcasts", "timeline"]),
    );
    expect(completion.items.find((item) => item.id === "fan_pass")).toMatchObject({
      controlId: "fan-pass",
      userFacingImpact: expect.stringMatching(/Fan Pass/i),
    });
  });

  it("maps creator-safe controls back to the existing creator settings shape", () => {
    const sanitized = sanitizeCreatorSettingsControlPlaneUpdate({
      fanPassEnabled: true,
      fanPassPriceGd: 900,
      fanPassWelcomeText: "Welcome in.",
      creatorRequestsEnabled: true,
      requestBasePriceGd: 650,
      callsEnabled: true,
      callPriceGd: 1200,
      broadcastsEnabled: false,
      broadcastDefaultAudience: "followers",
      profileTimelineEnabled: true,
      showApprovedDropsOnTimeline: true,
      showBroadcastsOnTimeline: false,
      profileDisplayName: "Jessica",
      bio: "Creator bio",
      profilePhotoURL: "https://example.com/avatar.jpg",
    });

    expect(sanitized.ok).toBe(true);
    if (!sanitized.ok) return;
    expect(sanitized.creatorSettings).toMatchObject({
      subscriptionsEnabled: true,
      subscriptionPriceGd: 900,
      fanPassWelcomeText: "Welcome in.",
      customRequestsEnabled: true,
      bookingsEnabled: true,
      phoneRatePerMinuteGd: 1200,
      videoRatePerMinuteGd: 1200,
      broadcastsEnabled: false,
      broadcastDefaultAudience: "followers",
      profileTimelineEnabled: true,
      showApprovedDropsOnTimeline: true,
      showBroadcastsOnTimeline: false,
    });
    expect(sanitized.profilePatch).toMatchObject({
      displayName: "Jessica",
      bio: "Creator bio",
      photoURL: "https://example.com/avatar.jpg",
    });
    expect(sanitized.changedSections).toEqual(expect.arrayContaining(["fan_pass", "gumdrop_experiences", "broadcasts", "timeline", "profile_basics"]));
  });

  it("rejects admin-only fields and invalid prices before they reach persistence", () => {
    const sanitized = sanitizeCreatorSettingsControlPlaneUpdate({
      fanPassPriceGd: 100,
      publicDiscovery: true,
      rotationEligibility: true,
      live: true,
      approved: true,
      creatorRestrictions: { payoutsRestricted: false },
    });

    expect(sanitized.ok).toBe(false);
    if (sanitized.ok) return;
    expect(sanitized.rejectedAdminOnlyFields).toEqual(
      expect.arrayContaining(["publicDiscovery", "rotationEligibility", "live", "approved", "creatorRestrictions"]),
    );
    expect(sanitized.errors).toEqual(expect.arrayContaining(["fanPassPriceGd must be at least 500 GD."]));
  });

  it("strips the complete admin-only field list used by the route and validator", () => {
    const stripped = stripAdminOnlyCreatorSettingsFields({
      fanPassEnabled: true,
      publicDiscovery: true,
      rotationEligibility: true,
      reviewStatus: "approved",
      reviewedByAdminId: "admin_1",
    });

    expect(stripped.input).toEqual({ fanPassEnabled: true });
    expect(stripped.rejectedAdminOnlyFields).toEqual(expect.arrayContaining(CREATOR_SETTINGS_ADMIN_ONLY_FIELDS.slice(0, 2)));
  });
});
