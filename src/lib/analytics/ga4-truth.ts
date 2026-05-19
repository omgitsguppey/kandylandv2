export type Ga4Status =
  | "wired_client"
  | "wired_server_evidence"
  | "config_missing"
  | "code_missing"
  | "intentionally_disabled"
  | "evidence_only"
  | "broken_refactor";

export type Ga4TruthConfig = {
  measurementId?: string | null;
  propertyId?: string | null;
  apiSecretPresent?: boolean;
  clientCodePresent?: boolean;
  serverDataApiDependencyPresent?: boolean;
  disabled?: boolean;
};

export type Ga4EvidenceState = {
  status: Ga4Status;
  truthState: "unavailable" | "deferred" | "partial" | "available";
  sourceRole: "external_evidence_only";
  productTruthSource: "first_party_analytics";
  firstPartyAnalyticsPrimary: true;
  ga4EvidenceOnly: true;
  clientGa4Configured: boolean;
  serverDataApiConfigured: boolean;
  serverMeasurementProtocolConfigured: boolean;
  trafficValue: number | null;
  displayValue: "Unavailable" | "Evidence only" | "Needs refresh";
  reason: string;
  nextAction: string;
};

export const GA4_ADMIN_REFRESH_TTL_MS = 5 * 60 * 1000;

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveGa4Status(config: Ga4TruthConfig): Ga4Status {
  if (config.disabled) {
    return "intentionally_disabled";
  }

  const clientConfigured = hasValue(config.measurementId);
  const serverConfigured = hasValue(config.propertyId);
  const measurementProtocolConfigured = clientConfigured && config.apiSecretPresent === true;

  if (!clientConfigured && !serverConfigured && !measurementProtocolConfigured) {
    return "config_missing";
  }

  if (clientConfigured && config.clientCodePresent === false) {
    return "broken_refactor";
  }

  if (clientConfigured && !serverConfigured) {
    return "wired_client";
  }

  if (serverConfigured && !clientConfigured) {
    return "wired_server_evidence";
  }

  return "evidence_only";
}

export function isGa4ClientEnabled(input: {
  measurementId?: string | null;
  consentGranted: boolean;
}) {
  return hasValue(input.measurementId) && input.consentGranted;
}

export function isGa4ServerEvidenceEnabled(input: {
  propertyId?: string | null;
  explicitRefresh: boolean;
}) {
  return hasValue(input.propertyId) && input.explicitRefresh;
}

export function shouldRunGa4AdminRefresh(input: {
  explicitRefresh: boolean;
  propertyId?: string | null;
  lastRunAtMs?: number | null;
  nowMs?: number;
  minIntervalMs?: number;
}) {
  if (!isGa4ServerEvidenceEnabled(input)) {
    return false;
  }

  const lastRunAtMs = input.lastRunAtMs ?? null;
  if (!lastRunAtMs || lastRunAtMs <= 0) {
    return true;
  }

  const nowMs = input.nowMs ?? Date.now();
  return nowMs - lastRunAtMs >= (input.minIntervalMs ?? GA4_ADMIN_REFRESH_TTL_MS);
}

export function buildGa4EvidenceState(config: Ga4TruthConfig): Ga4EvidenceState {
  const status = resolveGa4Status(config);
  const clientGa4Configured = hasValue(config.measurementId);
  const serverDataApiConfigured = hasValue(config.propertyId);
  const serverMeasurementProtocolConfigured = clientGa4Configured && config.apiSecretPresent === true;

  if (status === "config_missing") {
    return {
      status,
      truthState: "unavailable",
      sourceRole: "external_evidence_only",
      productTruthSource: "first_party_analytics",
      firstPartyAnalyticsPrimary: true,
      ga4EvidenceOnly: true,
      clientGa4Configured,
      serverDataApiConfigured,
      serverMeasurementProtocolConfigured,
      trafficValue: null,
      displayValue: "Unavailable",
      reason: "GA4 configuration is missing. First-party analytics remains product truth; missing GA4 evidence must not render as zero traffic.",
      nextAction: "Add GA4 measurement/property configuration only if owner-approved external evidence is needed.",
    };
  }

  if (status === "broken_refactor") {
    return {
      status,
      truthState: "partial",
      sourceRole: "external_evidence_only",
      productTruthSource: "first_party_analytics",
      firstPartyAnalyticsPrimary: true,
      ga4EvidenceOnly: true,
      clientGa4Configured,
      serverDataApiConfigured,
      serverMeasurementProtocolConfigured,
      trafficValue: null,
      displayValue: "Needs refresh",
      reason: "GA4 configuration exists, but the client evidence loader is not mounted.",
      nextAction: "Mount the consent-gated GA4 evidence tracker before treating client evidence as available.",
    };
  }

  return {
    status,
    truthState: serverDataApiConfigured ? "deferred" : "available",
    sourceRole: "external_evidence_only",
    productTruthSource: "first_party_analytics",
    firstPartyAnalyticsPrimary: true,
    ga4EvidenceOnly: true,
    clientGa4Configured,
    serverDataApiConfigured,
    serverMeasurementProtocolConfigured,
    trafficValue: null,
    displayValue: "Evidence only",
    reason: "GA4 is optional external evidence. First-party analytics remains product truth and GA4 totals must not replace KandyDrops event facts.",
    nextAction: "Use explicit refresh with cost guard when GA4 parity evidence is needed.",
  };
}
