export const EXTERNAL_ANALYTICS_TRUTH_CONTRACT_VERSION = "external_analytics_truth_closure_v1";

export const EXTERNAL_ANALYTICS_STATUSES = [
  "ga4_client_configured",
  "ga4_server_configured",
  "ga4_config_missing",
  "ga4_code_missing",
  "ga4_intentionally_disabled",
  "ga4_evidence_only",
  "ga4_broken_refactor",
  "posthog_configured",
  "posthog_missing",
  "external_disabled",
] as const;

export type ExternalAnalyticsStatus = (typeof EXTERNAL_ANALYTICS_STATUSES)[number];

export type ExternalAnalyticsTruthInput = {
  ga4ClientCodePresent?: boolean;
  ga4ClientMeasurementIdPresent?: boolean;
  ga4ServerPropertyIdPresent?: boolean;
  ga4ServerDataApiDependencyPresent?: boolean;
  ga4Disabled?: boolean;
  posthogClientCodePresent?: boolean;
  posthogKeyPresent?: boolean;
  externalDisabled?: boolean;
  explicitRefreshRequired?: boolean;
};

export type ExternalAnalyticsStatusResolution = {
  ga4: ExternalAnalyticsStatus[];
  posthog: ExternalAnalyticsStatus[];
  overall: ExternalAnalyticsStatus;
};

export type ExternalAnalyticsTruthState = ExternalAnalyticsStatusResolution & {
  ga4Statuses: ExternalAnalyticsStatus[];
  posthogStatuses: ExternalAnalyticsStatus[];
  firstPartyAnalyticsPrimary: true;
  externalAnalyticsProductTruth: false;
  missingExternalAnalyticsTrafficBehavior: "unavailable_not_zero";
  displayTrafficValue: number | null;
  defaultDataApiCallsBlocked: boolean;
  clientTrackersConsentGated: boolean;
  evidenceOnly: true;
  adminEvidenceConsumer: string;
  nextAction: string;
};

export type ExternalAnalyticsTruthValidation = {
  ok: boolean;
  findings: string[];
};

export const EXTERNAL_ANALYTICS_TRUTH_CONTRACT = {
  version: EXTERNAL_ANALYTICS_TRUTH_CONTRACT_VERSION,
  productTruthSource: "first_party_event_facts_and_rollups",
  externalAnalyticsProductTruth: false,
  missingTrafficBehavior: "unavailable_not_zero",
  ga4: {
    allowedStatuses: [
      "ga4_client_configured",
      "ga4_server_configured",
      "ga4_config_missing",
      "ga4_code_missing",
      "ga4_intentionally_disabled",
      "ga4_evidence_only",
      "ga4_broken_refactor",
      "external_disabled",
    ] as const,
    serverEvidenceRequiresExplicitRefresh: true,
    defaultDataApiCallsBlocked: true,
    dataApiMayRunOnDefaultAdminLoad: false,
  },
  posthog: {
    allowedStatuses: [
      "posthog_configured",
      "posthog_missing",
      "external_disabled",
    ] as const,
    evidenceOnly: true,
  },
  clientTrackers: {
    ga4: {
      component: "src/components/Analytics/Ga4EvidenceTracker.tsx",
      requiresEnv: ["NEXT_PUBLIC_GA_MEASUREMENT_ID"],
      requiresConsent: true,
      sendsLiveEventsInTests: false,
    },
    posthog: {
      component: "src/components/Analytics/CSPostHogProvider.tsx",
      requiresEnv: ["NEXT_PUBLIC_POSTHOG_KEY"],
      requiresConsent: true,
      sendsLiveEventsInTests: false,
    },
  },
  adminEvidence: {
    consumer: "Admin Analytics external evidence and Admin Debug parity",
    missingGa4Label: "GA4 evidence unavailable/config missing",
    missingPostHogLabel: "PostHog evidence unavailable/config missing",
  },
} as const;

function has(value: boolean | undefined) {
  return value === true;
}

export function resolveExternalAnalyticsStatuses(input: ExternalAnalyticsTruthInput): ExternalAnalyticsStatusResolution {
  if (input.externalDisabled) {
    return {
      ga4: ["external_disabled"],
      posthog: ["external_disabled"],
      overall: "external_disabled",
    };
  }

  const ga4: ExternalAnalyticsStatus[] = [];
  const posthog: ExternalAnalyticsStatus[] = [];

  if (input.ga4Disabled) {
    ga4.push("ga4_intentionally_disabled");
  } else if (!has(input.ga4ClientCodePresent) && !has(input.ga4ServerDataApiDependencyPresent)) {
    ga4.push("ga4_code_missing");
  } else {
    const clientConfigured = has(input.ga4ClientCodePresent) && has(input.ga4ClientMeasurementIdPresent);
    const serverConfigured = has(input.ga4ServerDataApiDependencyPresent) && has(input.ga4ServerPropertyIdPresent);

    if (clientConfigured) {
      ga4.push("ga4_client_configured");
    }
    if (serverConfigured) {
      ga4.push("ga4_server_configured");
    }
    if (!clientConfigured && !serverConfigured) {
      ga4.push("ga4_config_missing");
    }
    if (has(input.ga4ClientCodePresent) && !has(input.ga4ClientMeasurementIdPresent) && serverConfigured) {
      ga4.push("ga4_evidence_only");
    } else if (has(input.ga4ClientMeasurementIdPresent) && !has(input.ga4ClientCodePresent)) {
      ga4.push("ga4_broken_refactor");
    } else if (clientConfigured || serverConfigured) {
      ga4.push("ga4_evidence_only");
    }
  }

  if (has(input.posthogClientCodePresent) && has(input.posthogKeyPresent)) {
    posthog.push("posthog_configured");
  } else {
    posthog.push("posthog_missing");
  }

  return {
    ga4,
    posthog,
    overall: ga4.includes("ga4_evidence_only")
      ? "ga4_evidence_only"
      : ga4[0] ?? posthog[0] ?? "external_disabled",
  };
}

export function buildExternalAnalyticsTruthState(input: ExternalAnalyticsTruthInput): ExternalAnalyticsTruthState {
  const resolution = resolveExternalAnalyticsStatuses(input);
  const externalMissing = resolution.ga4.includes("ga4_config_missing")
    || resolution.ga4.includes("ga4_code_missing")
    || resolution.ga4.includes("ga4_intentionally_disabled")
    || resolution.ga4.includes("external_disabled");

  return {
    ...resolution,
    ga4Statuses: resolution.ga4,
    posthogStatuses: resolution.posthog,
    firstPartyAnalyticsPrimary: true,
    externalAnalyticsProductTruth: false,
    missingExternalAnalyticsTrafficBehavior: "unavailable_not_zero",
    displayTrafficValue: null,
    defaultDataApiCallsBlocked: input.explicitRefreshRequired !== false,
    clientTrackersConsentGated: true,
    evidenceOnly: true,
    adminEvidenceConsumer: EXTERNAL_ANALYTICS_TRUTH_CONTRACT.adminEvidence.consumer,
    nextAction: externalMissing
      ? "Keep first-party analytics as product truth and configure external analytics only if owner-approved evidence is needed."
      : "Use external analytics only as labeled comparison evidence.",
  };
}

export function validateExternalAnalyticsTruthClosure(): ExternalAnalyticsTruthValidation {
  const findings: string[] = [];

  if (EXTERNAL_ANALYTICS_TRUTH_CONTRACT.externalAnalyticsProductTruth !== false) {
    findings.push("External analytics can override first-party product truth.");
  }
  if (EXTERNAL_ANALYTICS_TRUTH_CONTRACT.missingTrafficBehavior !== "unavailable_not_zero") {
    findings.push("Missing external analytics is not explicitly unavailable_not_zero.");
  }
  if (!EXTERNAL_ANALYTICS_TRUTH_CONTRACT.ga4.defaultDataApiCallsBlocked
    || EXTERNAL_ANALYTICS_TRUTH_CONTRACT.ga4.dataApiMayRunOnDefaultAdminLoad) {
    findings.push("GA4 Data API can run on default admin load.");
  }
  if (!EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.ga4.requiresConsent
    || !EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.posthog.requiresConsent) {
    findings.push("External client trackers are not consent-gated.");
  }
  if (!EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.ga4.requiresEnv.includes("NEXT_PUBLIC_GA_MEASUREMENT_ID")
    || !EXTERNAL_ANALYTICS_TRUTH_CONTRACT.clientTrackers.posthog.requiresEnv.includes("NEXT_PUBLIC_POSTHOG_KEY")) {
    findings.push("External client trackers lack required public env gates.");
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
