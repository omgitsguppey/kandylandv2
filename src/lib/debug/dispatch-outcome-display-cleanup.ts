import { parseDropActivationSchedulerKey } from "@/lib/debug/drop-activation-scheduler-key";
import type { QueueDropMetadata } from "@/lib/debug/queue-drop-metadata-enrichment";

export type DispatchOutcomeDisplayInput = {
    schedulerKey?: string | null;
    activationKey?: string | null;
    outcome?: string | null;
    status?: string | null;
    errorCode?: string | null;
    scheduledAtUtc?: string | null;
    metadata: Pick<QueueDropMetadata, "dropId" | "dropTitle" | "confidence" | "missingReason" | "source" | "nextAction" | "dispatchOutcomeAffected">;
};

type DispatchMetadataBadge = "exact" | "inferred" | "legacy missing" | "missing lookup" | "source unavailable";

function metadataBadgeFor(metadata: DispatchOutcomeDisplayInput["metadata"]): DispatchMetadataBadge {
    if (metadata.confidence === "exact") return "exact";
    if (metadata.confidence === "inferred") return "inferred";
    if (metadata.source === "tombstone") return "legacy missing";
    if (metadata.missingReason === "metadata_source_unavailable") return "source unavailable";
    if (metadata.confidence === "missing") return "missing lookup";
    return "legacy missing";
}

function normalizeOutcome(value?: string | null) {
    return value || "unknown";
}

export function buildDispatchOutcomeDisplayModel(input: DispatchOutcomeDisplayInput) {
    const schedulerKey = input.schedulerKey || input.activationKey || "";
    const parsed = parseDropActivationSchedulerKey(schedulerKey);
    const scheduledAtUtc = input.scheduledAtUtc || parsed.scheduledAtUtc;
    const outcomeBadge = normalizeOutcome(input.outcome || input.status);
    const metadataBadge = metadataBadgeFor(input.metadata);
    const missingMetadata = input.metadata.confidence === "missing" || input.metadata.confidence === "legacy_missing";

    return {
        label: input.metadata.dropTitle || (input.metadata.dropId ? `Drop ${input.metadata.dropId.slice(0, 6)}` : "Unknown drop"),
        metadataBadge,
        metadataWarning: missingMetadata ? "drop_metadata_missing" : null,
        outcomeBadge,
        outcomeTruthState: outcomeBadge === "failed" ? "failed" as const : "live" as const,
        metadataTruthState: input.metadata.confidence === "exact" ? "live" as const : "degraded" as const,
        scheduledAtUtc,
        schedulerKeyParseError: parsed.parseError,
        rawDetailsDefaultOpen: false,
        defaultDropIdLabel: input.metadata.dropId ? input.metadata.dropId.slice(0, 6) : "unknown",
        outcomeAffectedByMetadata: input.metadata.dispatchOutcomeAffected,
        nextAction: input.metadata.nextAction,
    };
}
