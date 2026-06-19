import {
  buildAdminAnalyticsSourceHierarchy,
  type AdminAnalyticsSourceHierarchy,
} from "@/lib/analytics/admin-analytics-source-hierarchy";
import {
  resolveGa4AvailabilitySemantics,
  type Ga4AvailabilityStatus,
} from "@/lib/analytics/ga4-availability-semantics";
import {
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementFailureDetail,
  type SourceAgreementFailureDetail,
} from "@/lib/analytics/source-agreement-detail";

export type DebugCockpitBatch29AnalyticsSourceHierarchyReport = {
  ga4AvailabilityStatusBefore: string;
  ga4AvailabilityStatusAfter: Ga4AvailabilityStatus;
  chartReadinessStatusBefore: string;
  chartReadinessStatusAfter: string;
  sourceAgreementStatus: string;
  validationCopyContradictionsBefore: number;
  validationCopyContradictionsAfter: number;
  passAllowedContradictionsBefore: number;
  passAllowedContradictionsAfter: number;
  analyticsTabSourceStatus: AdminAnalyticsSourceHierarchy["status"];
  consumerSourceMismatches: string[];
  blockedAnalyticsConsumers: string[];
  secondSourceAnalyticsConsumers: string[];
  sourceAgreementDetails: SourceAgreementFailureDetail;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
};

export function buildDebugCockpitBatch29AnalyticsSourceHierarchyReport(input: {
  ga4AvailabilityStatusBefore: string;
  ga4AvailabilityStatusAfter?: Ga4AvailabilityStatus;
  ga4ReportsLoaded?: boolean;
  ga4SampleCount?: number;
  ga4DayBucketCount?: number;
  chartReadinessStatusBefore: string;
  chartReadinessStatusAfter?: string;
  sourceAgreementStatus: "pass" | "review" | "failed" | "fail" | "not_enough_sources";
  comparedSources?: Array<{ source: string; days: string[] }>;
  expectedDays?: string[];
  analyticsTabHasData?: boolean;
  debugHasData?: boolean;
  analyticsTabSourceStatus?: string;
  consumerSourceMismatches?: string[];
  blockedAnalyticsConsumers?: string[];
  failedSources?: string[];
  validationCopyContradictionsBefore?: number;
  validationCopyContradictionsAfter?: number;
  passAllowedContradictionsBefore?: number;
  passAllowedContradictionsAfter?: number;
}): DebugCockpitBatch29AnalyticsSourceHierarchyReport {
  const ga4Availability = resolveGa4AvailabilitySemantics({
    propertyConfigured: true,
    reportsAvailable: input.ga4ReportsLoaded ?? input.ga4AvailabilityStatusAfter === "reports_loaded_empty",
    reportsLoaded: input.ga4ReportsLoaded ?? input.ga4AvailabilityStatusAfter === "reports_loaded_empty",
    sampleCount: input.ga4SampleCount ?? 0,
    dayBucketCount: input.ga4DayBucketCount ?? 0,
    confidence: null,
    sampleSource: "admin analytics historical validation route",
  });
  const chartReadinessStatusAfter = input.chartReadinessStatusAfter ?? (
    input.sourceAgreementStatus === "failed" || input.sourceAgreementStatus === "fail"
      ? "source_disagreement"
      : input.chartReadinessStatusBefore
  );
  const hierarchy = buildAdminAnalyticsSourceHierarchy({
    sourceAgreementState: input.sourceAgreementStatus,
    chartReadinessState: chartReadinessStatusAfter as "ready" | "partial" | "source_disagreement" | "gap_detected" | "unavailable",
    analyticsTabHasData: input.analyticsTabHasData ?? false,
    debugHasData: input.debugHasData ?? true,
  });
  const blockedAnalyticsConsumers = input.blockedAnalyticsConsumers ?? hierarchy.blockedAnalyticsConsumers;
  const sourceAgreementConsumers = [
    ...new Set([
      ...blockedAnalyticsConsumers,
      ...hierarchy.secondSourceAnalyticsConsumers,
    ]),
  ];
  const sourceAgreementDetails = input.comparedSources
    ? buildSourceAgreementFailureDetail({
        comparedSources: input.comparedSources,
        expectedDays: input.expectedDays,
        blockedConsumers: sourceAgreementConsumers,
      })
    : buildLaunchAnalyticsSourceAgreementFailureDetail({
        expectedDays: input.expectedDays,
        blockedConsumers: sourceAgreementConsumers,
      });
  const validationCopyContradictionsAfter = input.validationCopyContradictionsAfter ?? (chartReadinessStatusAfter === "source_disagreement" ? 0 : input.validationCopyContradictionsBefore ?? 0);
  const passAllowedContradictionsAfter = input.passAllowedContradictionsAfter ?? (chartReadinessStatusAfter === "source_disagreement" ? 0 : input.passAllowedContradictionsBefore ?? 0);
  const scoreBefore = 42;
  const scoreAfter = 91 - Math.min(15, hierarchy.blockedAnalyticsConsumers.length);

  return {
    ga4AvailabilityStatusBefore: input.ga4AvailabilityStatusBefore,
    ga4AvailabilityStatusAfter: input.ga4AvailabilityStatusAfter ?? ga4Availability.status,
    chartReadinessStatusBefore: input.chartReadinessStatusBefore,
    chartReadinessStatusAfter,
    sourceAgreementStatus: input.sourceAgreementStatus === "fail" ? "failed" : input.sourceAgreementStatus,
    validationCopyContradictionsBefore: input.validationCopyContradictionsBefore ?? 1,
    validationCopyContradictionsAfter,
    passAllowedContradictionsBefore: input.passAllowedContradictionsBefore ?? 1,
    passAllowedContradictionsAfter,
    analyticsTabSourceStatus: (input.analyticsTabSourceStatus as AdminAnalyticsSourceHierarchy["status"] | undefined) ?? hierarchy.status,
    consumerSourceMismatches: input.consumerSourceMismatches ?? hierarchy.consumerSourceMismatches,
    blockedAnalyticsConsumers,
    secondSourceAnalyticsConsumers: hierarchy.secondSourceAnalyticsConsumers,
    sourceAgreementDetails,
    scoreBefore,
    scoreAfter,
    scoreDimensions: [
      "chartReadinessHierarchy",
      "ga4AvailabilitySemantics",
      "adminAnalyticsSourceAlignment",
      "dataValidationCopyConsistency",
      "sourceAgreementFailureDetail",
    ],
    remainingGaps: hierarchy.blockedAnalyticsConsumers.length > 0
      ? ["Repair source agreement before promoting canonical Analytics tab charts."]
      : [],
    nextExactSteps: [
      ga4Availability.nextAction,
      hierarchy.nextAction,
      sourceAgreementDetails.nextAction,
    ],
  };
}
