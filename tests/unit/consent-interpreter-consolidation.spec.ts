import { describe, expect, it } from "vitest";

import {
  canCollectBehavioralEvent,
  canCollectOperationalEvent,
  canCollectSecurityEvent,
  canUseForJourney,
  explainConsentDecision,
  resolveConsentState,
  validateConsentInterpreterConsolidation,
} from "@/lib/privacy-data/consent-interpreter";

describe("consent interpreter consolidation", () => {
  it("allows required safety events while denied consent blocks behavioral tracking", () => {
    expect(validateConsentInterpreterConsolidation()).toEqual([]);
    const denied = resolveConsentState({ consentMode: "necessary_only" });

    expect(canCollectSecurityEvent({ consent: denied, eventName: "security_rate_limit_triggered" })).toBe(true);
    expect(canCollectOperationalEvent({ consent: denied, eventName: "auth_session_established" })).toBe(true);
    expect(canCollectBehavioralEvent({ consent: denied, eventName: "semantic_drop_viewed" })).toBe(false);
    expect(canUseForJourney({ consent: denied })).toBe(false);
  });

  it("explains accepted cookie and guest handoff decisions", () => {
    const accepted = resolveConsentState({ decision: "accept_all", source: "banner", guestId: "guest-1", userId: "user-1" });

    expect(canCollectBehavioralEvent({ consent: accepted, eventName: "semantic_drop_viewed" })).toBe(true);
    expect(explainConsentDecision({ consent: accepted, eventName: "semantic_drop_viewed" })).toContain("guest_to_user_handoff");
  });
});
