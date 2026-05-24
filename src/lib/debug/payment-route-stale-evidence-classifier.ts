export type PaymentRouteStaleEvidenceInput = {
    routeKey: string;
    lastSampleAgeMs: number | null;
    freshnessWindowMs: number;
    operatorEvidencePresent: boolean;
    deployedSmokePresent: boolean;
};

export function classifyPaymentRouteStaleEvidence(input: PaymentRouteStaleEvidenceInput) {
    const stale = input.lastSampleAgeMs === null || input.lastSampleAgeMs >= Math.max(1, input.freshnessWindowMs);
    const status = stale || !input.deployedSmokePresent
        ? "stale_critical_evidence_required"
        : "current_healthy";

    return {
        ...input,
        status,
        operatorEvidenceClearsRouteFreshness: false,
        paymentRuntimeChanged: false,
        createCaptureEvidenceConflated: false,
        nextAction: status === "stale_critical_evidence_required"
            ? `${input.routeKey} needs formal payment smoke/operator evidence plus fresh route runtime before current readiness.`
            : `${input.routeKey} has fresh deployed route evidence.`,
    };
}
