import type { AdminAnalyticsState } from "../hooks/useAdminAnalyticsState";

type JourneyFunnelStep = AdminAnalyticsState["journeyFunnelModel"]["steps"][number];
type AuthMethodBreakdownItem = AdminAnalyticsState["authOutcomeModel"]["methodBreakdown"][number];
type GuestBounceQualityModel = AdminAnalyticsState["guestBounceQualityModel"];

export function buildJourneyFunnelChartRows(steps: JourneyFunnelStep[]) {
  return steps.map((step) => ({
    ...step,
    chartLabel:
      step.visibleLabel.length > 14
        ? `${step.visibleLabel.slice(0, 14)}...`
        : step.visibleLabel,
    countValue: step.displayedCount ?? 0,
    percentValue: step.displayedPercent === null ? 0 : Math.round(step.displayedPercent * 100),
  }));
}

export function formatAuthFailureReason(failureCode: string | null | undefined) {
  return !failureCode || failureCode === "failure_code_unavailable"
    ? "Failure reason not captured"
    : failureCode;
}

export function buildAuthMethodChartRows(methodBreakdown: AuthMethodBreakdownItem[]) {
  return methodBreakdown.map((item) => ({
    ...item,
    chartLabel:
      item.visibleLabel.length > 14
        ? `${item.visibleLabel.slice(0, 14)}...`
        : item.visibleLabel,
    attemptsValue: item.attempts ?? 0,
    successesValue: item.successes ?? 0,
    failuresValue: item.failures ?? 0,
    unfinishedValue: item.unfinished ?? 0,
  }));
}

export function buildGuestQualityChartRows(guestBounceQualityModel: GuestBounceQualityModel) {
  return [
    {
      label: "Estimated views",
      value: guestBounceQualityModel.estimatedGuestViews.value ?? 0,
      source: guestBounceQualityModel.estimatedGuestViews.sourceTruth,
      state: guestBounceQualityModel.estimatedGuestViews.freshnessState,
    },
    {
      label: "Guest sample",
      value:
        guestBounceQualityModel.guestQuality.state === "available"
          ? guestBounceQualityModel.guestQuality.sampleCount
          : 0,
      source: guestBounceQualityModel.guestQuality.state,
      state: guestBounceQualityModel.guestQuality.state,
    },
    {
      label: "Signed-in sample",
      value: guestBounceQualityModel.signedInBounce.sampleCount ?? 0,
      source: guestBounceQualityModel.signedInBounce.freshnessState,
      state: guestBounceQualityModel.signedInBounce.freshnessState,
    },
  ];
}
