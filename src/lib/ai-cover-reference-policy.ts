export type OrderedCoverReferenceLike = {
    id?: string | null;
    selectionOrder?: number | null;
    selectedAtOrder?: number | null;
    order?: number | null;
    priority?: number | null;
    selectionScore?: number | null;
    createdAtMs?: number | null;
    uploadedAtMs?: number | null;
    updatedAtMs?: number | null;
    createdAt?: string | number | Date | null;
};

export type AllowedCoverReferenceSelection<T> = {
    selectedReferences: T[];
    referenceLimitApplied: boolean;
    requestedReferenceCount: number;
    usedReferenceCount: number;
    maxReferenceCount: number;
    droppedReferenceCount: number;
};

function readFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : null;
}

function toTimestamp(value: unknown) {
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.getTime() : null;
    }

    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return readFiniteNumber(value);
}

function compareNullableNumbers(left: number | null, right: number | null, direction: "asc" | "desc") {
    if (left === null && right === null) {
        return 0;
    }
    if (left === null) {
        return 1;
    }
    if (right === null) {
        return -1;
    }
    return direction === "asc" ? left - right : right - left;
}

function getStableReferenceOrder<T extends OrderedCoverReferenceLike>(references: T[]) {
    const withIndex = references.map((reference, index) => ({ reference, index }));
    const hasExplicitSelectionOrder = withIndex.some(({ reference }) => (
        readFiniteNumber(reference.selectionOrder) !== null
        || readFiniteNumber(reference.selectedAtOrder) !== null
    ));

    if (hasExplicitSelectionOrder) {
        return withIndex
            .sort((left, right) => {
                const bySelectionOrder = compareNullableNumbers(
                    readFiniteNumber(left.reference.selectionOrder) ?? readFiniteNumber(left.reference.selectedAtOrder),
                    readFiniteNumber(right.reference.selectionOrder) ?? readFiniteNumber(right.reference.selectedAtOrder),
                    "asc",
                );
                if (bySelectionOrder !== 0) {
                    return bySelectionOrder;
                }
                return left.index - right.index;
            })
            .map(({ reference }) => reference);
    }

    const hasPriorityMetadata = withIndex.some(({ reference }) => (
        readFiniteNumber(reference.priority) !== null
        || readFiniteNumber(reference.selectionScore) !== null
        || readFiniteNumber(reference.order) !== null
        || toTimestamp(reference.createdAtMs) !== null
        || toTimestamp(reference.uploadedAtMs) !== null
        || toTimestamp(reference.createdAt) !== null
        || toTimestamp(reference.updatedAtMs) !== null
    ));

    if (!hasPriorityMetadata) {
        return references.slice();
    }

    return withIndex
        .sort((left, right) => {
                const byPriority = compareNullableNumbers(
                readFiniteNumber(left.reference.priority) ?? readFiniteNumber(left.reference.selectionScore),
                readFiniteNumber(right.reference.priority) ?? readFiniteNumber(right.reference.selectionScore),
                "desc",
            );
            if (byPriority !== 0) {
                return byPriority;
            }

            const byOrder = compareNullableNumbers(
                readFiniteNumber(left.reference.order),
                readFiniteNumber(right.reference.order),
                "asc",
            );
            if (byOrder !== 0) {
                return byOrder;
            }

            const byCreatedAt = compareNullableNumbers(
                toTimestamp(left.reference.createdAtMs)
                    ?? toTimestamp(left.reference.uploadedAtMs)
                    ?? toTimestamp(left.reference.createdAt)
                    ?? toTimestamp(left.reference.updatedAtMs),
                toTimestamp(right.reference.createdAtMs)
                    ?? toTimestamp(right.reference.uploadedAtMs)
                    ?? toTimestamp(right.reference.createdAt)
                    ?? toTimestamp(right.reference.updatedAtMs),
                "asc",
            );
            if (byCreatedAt !== 0) {
                return byCreatedAt;
            }

            return left.index - right.index;
        })
        .map(({ reference }) => reference);
}

export function selectAllowedCoverReferences<T extends OrderedCoverReferenceLike>(
    references: T[],
    maxReferenceImages: number,
): AllowedCoverReferenceSelection<T> {
    const normalizedMaxReferenceImages = Math.max(0, Math.floor(maxReferenceImages || 0));
    const orderedReferences = getStableReferenceOrder(references);
    const selectedReferences = normalizedMaxReferenceImages === 0
        ? []
        : orderedReferences.slice(0, normalizedMaxReferenceImages);
    const requestedReferenceCount = orderedReferences.length;
    const usedReferenceCount = selectedReferences.length;
    const droppedReferenceCount = Math.max(0, requestedReferenceCount - usedReferenceCount);

    return {
        selectedReferences,
        referenceLimitApplied: droppedReferenceCount > 0,
        requestedReferenceCount,
        usedReferenceCount,
        maxReferenceCount: normalizedMaxReferenceImages,
        droppedReferenceCount,
    };
}
