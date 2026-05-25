export type QueueMetadataGapItem = {
    outcome: string;
    schedulerKeyParsed: boolean;
    metadataConfidence: "exact" | "inferred" | "legacy_missing" | "missing";
    dropId?: string | null;
    deletedOrArchived?: boolean;
    sourceUnavailable?: boolean;
    payloadCorrectnessGap?: boolean;
};

export function buildQueueMetadataGapSummary(items: readonly QueueMetadataGapItem[]) {
    const sentOutcomes = items.filter((item) => item.outcome === "sent").length;
    const failedOutcomes = items.filter((item) => item.outcome === "failed").length;
    const metadataResolved = items.filter((item) => item.metadataConfidence === "exact" || item.metadataConfidence === "inferred").length;
    const metadataMissing = items.length - metadataResolved;
    const schedulerKeysParsed = items.filter((item) => item.schedulerKeyParsed).length;
    const schedulerKeysUnparsed = items.length - schedulerKeysParsed;
    const deletedOrArchivedDrops = items.filter((item) => item.deletedOrArchived).length;
    const sourceUnavailableCount = items.filter((item) => item.sourceUnavailable).length;
    const payloadCorrectnessGapCount = items.filter((item) => item.payloadCorrectnessGap).length;
    const debugOnlyEnrichmentGapCount = Math.max(0, metadataMissing - payloadCorrectnessGapCount);
    const topMissingDropIds = Array.from(new Set(items
        .filter((item) => item.metadataConfidence === "missing" || item.metadataConfidence === "legacy_missing")
        .map((item) => item.dropId)
        .filter((value): value is string => Boolean(value))))
        .slice(0, 20);

    return {
        totalDispatchOutcomes: items.length,
        sentOutcomes,
        failedOutcomes,
        metadataResolved,
        metadataMissing,
        schedulerKeysParsed,
        schedulerKeysUnparsed,
        dropsMissingById: topMissingDropIds.length,
        deletedOrArchivedDrops,
        sourceUnavailableCount,
        topMissingDropIds,
        scoreImpact: payloadCorrectnessGapCount > 0 ? 3 : metadataMissing > 0 ? 1 : 0,
        debugOnlyEnrichmentGapCount,
        payloadCorrectnessGapCount,
        dispatchHealthStatus: failedOutcomes > 0
            ? "dispatch_failures_present"
            : metadataMissing > 0
                ? "sent_outcomes_readable_with_enrichment_caveat"
                : "sent_outcomes_metadata_resolved",
        nextAction: payloadCorrectnessGapCount > 0
            ? "Verify notification payload correctness for sends that may have used unknown titles."
            : metadataMissing > 0
                ? "Fix debug metadata enrichment with bounded explicit-ID lookup or tombstone classification."
                : "Keep queue metadata enrichment current.",
    };
}
