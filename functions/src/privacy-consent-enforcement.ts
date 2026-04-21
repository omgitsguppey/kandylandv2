import {AnalyticsEventFact, readString} from "./analytics-core.js"

export interface PrivacyEnforcementResult {
  allowed: boolean;
  anonymized: boolean;
  sanitizedFact?: Partial<AnalyticsEventFact>;
  reason?: "consent_denied" | "global_privacy_control";
}

/**
 * Enforces GDPR and User Consent settings on incoming telemetry events.
 * Rejects identified behavioral capture when consent is denied.
 *
 * @param fact The raw incoming event fact.
 * @returns A PrivacyEnforcementResult dictating what to do with the event.
 */
export function enforcePrivacyConsentOnEvent(fact: AnalyticsEventFact): PrivacyEnforcementResult {
  const consentMode = readString(fact.consentMode)
  const gpcBlocked = fact.globalPrivacyControl === true
  const isDenied = consentMode === "denied" || gpcBlocked

  if (!isDenied) {
    return {
      allowed: true,
      anonymized: false,
    }
  }

  return {
    allowed: false,
    anonymized: false,
    reason: gpcBlocked ? "global_privacy_control" : "consent_denied",
  }
}
