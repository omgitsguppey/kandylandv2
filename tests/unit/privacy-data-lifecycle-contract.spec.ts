import { describe, expect, it } from "vitest";

import {
  PRIVACY_DATA_LIFECYCLE_OBJECTS,
  resolvePrivacyDataLifecycleDecision,
  validatePrivacyDataLifecycleContract,
} from "@/lib/privacy-data/privacy-data-lifecycle-contract";

describe("privacy data lifecycle contract", () => {
  it("maps every tracked object to privacy, consent, retention, export, delete, and redaction policy", () => {
    expect(validatePrivacyDataLifecycleContract()).toEqual([]);
    expect(PRIVACY_DATA_LIFECYCLE_OBJECTS.length).toBeGreaterThan(10);
    for (const object of PRIVACY_DATA_LIFECYCLE_OBJECTS) {
      expect(object.privacyClass).toBeTruthy();
      expect(object.consentClass).toBeTruthy();
      expect(object.retentionClass).toBeTruthy();
      expect(object.exportEligibility).toBeTruthy();
      expect(object.deleteEligibility).toBeTruthy();
      expect(object.redactionPolicy).toBeTruthy();
    }
  });

  it("blocks denied-consent behavioral use and raw sensitive exports", () => {
    const behavioral = resolvePrivacyDataLifecycleDecision({
      objectKey: "behavioral_journey_event",
      consentClass: "denied",
    });
    const payment = resolvePrivacyDataLifecycleDecision({
      objectKey: "payment_receipt_summary",
      consentClass: "consent_not_required_operational",
    });

    expect(behavioral.canUseForBehavioralIntelligence).toBe(false);
    expect(payment.canExport).toBe(true);
    expect(payment.redactionPolicy).toContain("fingerprint");
    expect(payment.canShowInAdmin).toBe("redacted_summary");
  });
});
