export type ScheduledRouteStatus =
    | "scheduled_current_healthy"
    | "scheduled_stale_success"
    | "scheduled_stale_failure"
    | "scheduled_no_recent_run"
    | "scheduled_disabled_or_manual"
    | "scheduled_unknown";

export type ScheduledRouteInput = {
    routeKey: string;
    lastResult: "success" | "client_error" | "server_error" | "no_sample" | string;
    lastSampleAgeMs: number | null;
    freshnessWindowMs: number;
    schedulerExpected: boolean;
    disabledOrManual?: boolean;
};

export function classifyScheduledRouteSample(input: ScheduledRouteInput) {
    const stale = input.lastSampleAgeMs === null || input.lastSampleAgeMs >= Math.max(1, input.freshnessWindowMs);
    const failedResult = input.lastResult === "server_error" || input.lastResult === "client_error";
    const status: ScheduledRouteStatus = input.disabledOrManual
        ? "scheduled_disabled_or_manual"
        : input.lastResult === "no_sample"
            ? input.schedulerExpected ? "scheduled_no_recent_run" : "scheduled_unknown"
            : stale && failedResult
                ? "scheduled_stale_failure"
                : stale
                    ? "scheduled_stale_success"
                    : failedResult
                        ? "scheduled_unknown"
                        : "scheduled_current_healthy";

    return {
        ...input,
        status,
        currentFailure: !stale && failedResult,
        validatorRunsCron: false,
        nextAction: status === "scheduled_stale_failure" || status === "scheduled_no_recent_run"
            ? "Check scheduler evidence or run an approved manual smoke outside this validator."
            : "No cron execution is performed by this validation lane.",
    };
}
