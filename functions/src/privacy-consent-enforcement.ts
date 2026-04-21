import {AnalyticsEventFact, readString} from "./analytics-core.js"

export interface PrivacyEnforcementResult {
  allowed: boolean;
  anonymized: boolean;
  sanitizedFact?: Partial<AnalyticsEventFact>;
}

/**
 * Enforces GDPR and User Consent settings on incoming telemetry events.
 * Strips PII (userId, username, sessionId) if consent is denied.
 *
 * @param fact The raw incoming event fact.
 * @returns A PrivacyEnforcementResult dictating what to do with the event.
 */
export function enforcePrivacyConsentOnEvent(fact: AnalyticsEventFact): PrivacyEnforcementResult {
  const consentMode = readString(fact.consentMode)
  const isDenied = consentMode === "denied" || fact.globalPrivacyControl === true

  if (!isDenied) {
    return {
      allowed: true,
      anonymized: false,
    }
  }

  // If consent is denied, we enforce anonymization.
  // We strip PII but still allow the "anonymous" pageview or drop load to increment global counts.
  return {
    allowed: true,
    anonymized: true,
    sanitizedFact: {
      userId: "",
      username: "",
      sessionId: "",
      // Keep eventName, dropId, dropTitle, pagePath for global aggregate counting
    }
  }
}
