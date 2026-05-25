export type QueueDropMetadataSource =
    | "embedded_outcome_snapshot"
    | "embedded_queue_snapshot"
    | "bounded_drop_lookup"
    | "tombstone"
    | "missing";

export type QueueDropMetadataConfidence =
    | "exact"
    | "inferred"
    | "legacy_missing"
    | "missing";

export type QueueDropRecordLike = {
    title?: unknown;
    dropTitle?: unknown;
    name?: unknown;
    creatorId?: unknown;
    submittedByCreatorId?: unknown;
    status?: unknown;
    deletedAt?: unknown;
    archivedAt?: unknown;
};

export type QueueDropMetadataInput = {
    dropId?: string | null;
    embeddedOutcomeSnapshot?: QueueDropRecordLike | null;
    embeddedQueueSnapshot?: QueueDropRecordLike | null;
    boundedDropRecord?: QueueDropRecordLike | null;
    creatorName?: string | null;
    lookupSourceUnavailable?: boolean;
};

export type QueueDropMetadata = {
    dropId: string | null;
    shortDropId: string;
    dropTitle: string;
    creatorName: string | null;
    creatorId: string | null;
    dropStatus: string | null;
    source: QueueDropMetadataSource;
    confidence: QueueDropMetadataConfidence;
    missingReason: string | null;
    nextAction: string;
    dispatchOutcomeAffected: false;
};

export function shortDropId(dropId?: string | null) {
    return dropId ? dropId.slice(0, 6) : "unknown";
}

function readString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function titleFrom(record?: QueueDropRecordLike | null) {
    return readString(record?.title) || readString(record?.dropTitle) || readString(record?.name);
}

function creatorIdFrom(record?: QueueDropRecordLike | null) {
    return readString(record?.creatorId) || readString(record?.submittedByCreatorId);
}

function statusFrom(record?: QueueDropRecordLike | null) {
    return readString(record?.status);
}

function isTombstone(record?: QueueDropRecordLike | null) {
    const status = statusFrom(record);
    return Boolean(record && (status === "deleted" || status === "archived" || record.deletedAt || record.archivedAt));
}

function exactMetadata(input: QueueDropMetadataInput, source: QueueDropMetadataSource, record: QueueDropRecordLike, title: string): QueueDropMetadata {
    return {
        dropId: input.dropId || null,
        shortDropId: shortDropId(input.dropId),
        dropTitle: title,
        creatorName: input.creatorName || null,
        creatorId: creatorIdFrom(record),
        dropStatus: statusFrom(record),
        source,
        confidence: "exact",
        missingReason: null,
        nextAction: "Drop metadata resolved from bounded debug source.",
        dispatchOutcomeAffected: false,
    };
}

export function enrichQueueDropMetadata(input: QueueDropMetadataInput): QueueDropMetadata {
    const sources: Array<[QueueDropMetadataSource, QueueDropRecordLike | null | undefined]> = [
        ["embedded_outcome_snapshot", input.embeddedOutcomeSnapshot],
        ["embedded_queue_snapshot", input.embeddedQueueSnapshot],
        ["bounded_drop_lookup", input.boundedDropRecord],
    ];

    for (const [source, record] of sources) {
        if (!record) continue;
        if (isTombstone(record)) {
            return {
                dropId: input.dropId || null,
                shortDropId: shortDropId(input.dropId),
                dropTitle: `Deleted/archived drop ${shortDropId(input.dropId)}`,
                creatorName: input.creatorName || null,
                creatorId: creatorIdFrom(record),
                dropStatus: statusFrom(record) || "archived",
                source: "tombstone",
                confidence: "legacy_missing",
                missingReason: "drop_deleted_or_archived",
                nextAction: "Keep tombstone status visible; do not mark sent notification outcome failed for metadata enrichment.",
                dispatchOutcomeAffected: false,
            };
        }
        const title = titleFrom(record);
        if (title) return exactMetadata(input, source, record, title);
    }

    if (input.lookupSourceUnavailable) {
        return {
            dropId: input.dropId || null,
            shortDropId: shortDropId(input.dropId),
            dropTitle: input.dropId ? `Drop ${shortDropId(input.dropId)}` : "Unknown drop",
            creatorName: input.creatorName || null,
            creatorId: null,
            dropStatus: null,
            source: "missing",
            confidence: "missing",
            missingReason: "metadata_source_unavailable",
            nextAction: "Metadata lookup source unavailable; keep fallback label and retry bounded explicit-ID lookup later.",
            dispatchOutcomeAffected: false,
        };
    }

    return {
        dropId: input.dropId || null,
        shortDropId: shortDropId(input.dropId),
        dropTitle: input.dropId ? `Drop ${shortDropId(input.dropId)}` : "Unknown drop",
        creatorName: input.creatorName || null,
        creatorId: null,
        dropStatus: null,
        source: "missing",
        confidence: "missing",
        missingReason: input.dropId ? "bounded_lookup_no_document" : "drop_id_missing",
        nextAction: input.dropId
            ? "Keep drop metadata gap visible and verify whether the drop was deleted, archived, or outside the bounded lookup sample."
            : "No drop id is available; keep raw scheduler details collapsed.",
        dispatchOutcomeAffected: false,
    };
}
