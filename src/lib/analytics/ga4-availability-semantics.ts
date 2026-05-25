export type Ga4AvailabilityStatus =
  | "config_present"
  | "reports_available"
  | "reports_loaded_with_samples"
  | "reports_loaded_empty"
  | "source_ready_no_sample_loaded"
  | "unavailable"
  | "unverified";

export type Ga4AvailabilitySemantics = {
  status: Ga4AvailabilityStatus;
  setupPassAllowed: boolean;
  provesUsableChartData: boolean;
  provesSourceAgreement: boolean;
  displayConfidence: number | "n/a";
  sampleCount: number;
  dayBucketCount: number;
  nextAction: string;
};

export function resolveGa4AvailabilitySemantics(input: {
  propertyConfigured?: boolean;
  reportsAvailable?: boolean;
  reportsLoaded?: boolean;
  sampleCount?: number | null;
  dayBucketCount?: number | null;
  confidence?: number | null;
  sampleSource?: string | null;
  passAllowed?: boolean;
}): Ga4AvailabilitySemantics {
  const sampleCount = Math.max(0, input.sampleCount ?? 0);
  const dayBucketCount = Math.max(0, input.dayBucketCount ?? 0);
  const setupPassAllowed = Boolean(input.propertyConfigured && input.reportsAvailable);
  const displayConfidence = input.confidence === null || input.confidence === undefined ? "n/a" : input.confidence;
  const hasSamples = sampleCount > 0 || dayBucketCount > 0;

  if (!input.propertyConfigured) {
    return {
      status: "unavailable",
      setupPassAllowed: false,
      provesUsableChartData: false,
      provesSourceAgreement: false,
      displayConfidence,
      sampleCount,
      dayBucketCount,
      nextAction: "Configure and verify the GA4 property before using GA4 as analytics evidence.",
    };
  }

  if (input.reportsLoaded && hasSamples) {
    return {
      status: "reports_loaded_with_samples",
      setupPassAllowed,
      provesUsableChartData: true,
      provesSourceAgreement: false,
      displayConfidence,
      sampleCount,
      dayBucketCount,
      nextAction: "Compare GA4 samples against historical snapshot and legacy support before promoting chart data to canonical.",
    };
  }

  if (input.reportsLoaded) {
    return {
      status: "reports_loaded_empty",
      setupPassAllowed,
      provesUsableChartData: false,
      provesSourceAgreement: false,
      displayConfidence,
      sampleCount,
      dayBucketCount,
      nextAction: `GA4 reports loaded from ${input.sampleSource || "the configured route"}, but no sample rows or day buckets were present. Keep this as setup availability only until data samples load.`,
    };
  }

  if (input.reportsAvailable) {
    return {
      status: "reports_available",
      setupPassAllowed,
      provesUsableChartData: false,
      provesSourceAgreement: false,
      displayConfidence,
      sampleCount,
      dayBucketCount,
      nextAction: "GA4 reports are reachable, but chart data still requires loaded sample rows or day buckets.",
    };
  }

  return {
    status: input.propertyConfigured ? "config_present" : "unverified",
    setupPassAllowed: false,
    provesUsableChartData: false,
    provesSourceAgreement: false,
    displayConfidence,
    sampleCount,
    dayBucketCount,
    nextAction: "Verify GA4 report access before treating setup availability as data evidence.",
  };
}
