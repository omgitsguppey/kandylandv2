export type LegacyQueueAdapterStatus =
    | "blocking_runtime_continuity_drift"
    | "allowed_legacy_window"
    | "deprecated_no_usage"
    | "unknown";

export type LegacyQueueAdapterPolicyInput = {
    usageCount: number;
    missingDispatchOutcomeCount: number;
    sourceLoaded: boolean;
    allowedLegacyWindow?: boolean;
};

export type LegacyQueueAdapterPolicy = {
    status: LegacyQueueAdapterStatus;
    usageCount: number;
    missingDispatchOutcomeCount: number;
    blockingDriftCount: number;
    blocksContinuity: boolean;
    removalPolicy: string;
    nextAction: string;
};

export function classifyLegacyQueueAdapterUsage(input: LegacyQueueAdapterPolicyInput): LegacyQueueAdapterPolicy {
    const usageCount = Math.max(0, Math.floor(Number(input.usageCount) || 0));
    const missingDispatchOutcomeCount = Math.max(0, Math.floor(Number(input.missingDispatchOutcomeCount) || 0));

    if (!input.sourceLoaded) {
        return {
            status: "unknown",
            usageCount,
            missingDispatchOutcomeCount,
            blockingDriftCount: 0,
            blocksContinuity: false,
            removalPolicy: "Legacy queue adapters are compatibility-only and must be checked through runtime warning evidence.",
            nextAction: "Load runtime warning source before claiming queue drift=0 or no adapter usage.",
        };
    }

    if (usageCount > 0 || missingDispatchOutcomeCount > 0) {
        return {
            status: input.allowedLegacyWindow ? "allowed_legacy_window" : "blocking_runtime_continuity_drift",
            usageCount,
            missingDispatchOutcomeCount,
            blockingDriftCount: usageCount + missingDispatchOutcomeCount,
            blocksContinuity: !input.allowedLegacyWindow,
            removalPolicy: "Legacy queue adapters must migrate to canonical queue runtime and every dispatch attempt must persist an outcome row.",
            nextAction: "Remove or migrate legacy queue adapter usage and repair missing dispatch outcome writes.",
        };
    }

    return {
        status: "deprecated_no_usage",
        usageCount,
        missingDispatchOutcomeCount,
        blockingDriftCount: 0,
        blocksContinuity: false,
        removalPolicy: "Keep adapter compatibility visible until removal is approved; no current usage is loaded.",
        nextAction: "Keep adapter warning source loaded and remove compatibility adapter in a separately owned cleanup.",
    };
}
