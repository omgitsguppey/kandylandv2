export const GOOGLE_ANALYTICS_SOURCE_POLICY_VERSION = "ga4_optional_evidence_v1";

export const GOOGLE_ANALYTICS_OPTIONAL_STATUS = {
  connected: "optional_connected",
  notConnected: "optional_not_connected",
} as const;

export function isGoogleAnalyticsCanonicalTruthAllowed() {
  return false;
}

export function normalizeGoogleAnalyticsAvailability(isConnected: boolean) {
  return isConnected ? GOOGLE_ANALYTICS_OPTIONAL_STATUS.connected : GOOGLE_ANALYTICS_OPTIONAL_STATUS.notConnected;
}

export function getGoogleAnalyticsMissingReasonCode() {
  return "ga_not_connected_optional";
}
