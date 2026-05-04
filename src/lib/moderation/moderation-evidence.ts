export type ModerationEvidenceSource =
    | "server"
    | "viewer"
    | "telemetry"
    | "storage"
    | "entitlement"
    | "legacy"
    | "manual";

export type ModerationEvidenceConfidence = "unknown" | "heuristic" | "strong" | "confirmed";
export type ModerationFalsePositiveRisk = "low" | "medium" | "high" | "unknown";

export type ModerationEvidence = {
    id: string;
    userId?: string;
    sessionId?: string;
    anonymousVisitorId?: string;
    creatorId?: string;
    dropId?: string;
    fileId?: string;
    assetKey?: string;
    viewerSessionId?: string;
    watchSessionId?: string;
    route?: string;
    source: ModerationEvidenceSource;
    eventType: string;
    observedAt: number;
    confidence: ModerationEvidenceConfidence;
    rawReason: string;
    normalizedReason: string;
    humanSummary: string;
    weight: number;
    falsePositiveRisk: ModerationFalsePositiveRisk;
    safeDetails: Record<string, unknown>;
};

function toStringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim().length > 0) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return Math.trunc(numeric);
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function normalizeConfidence(value: unknown): ModerationEvidenceConfidence {
    if (value === "confirmed" || value === "strong" || value === "heuristic" || value === "unknown") return value;
    if (value === true) return "confirmed";
    return "unknown";
}

function normalizeSource(value: unknown, reason: string): ModerationEvidenceSource {
    if (value === "server" || value === "viewer" || value === "telemetry" || value === "storage" || value === "entitlement" || value === "legacy" || value === "manual") {
        return value;
    }
    if (reason.includes("entitlement") || reason.includes("403") || reason.includes("401")) return "entitlement";
    if (reason.includes("asset") || reason.includes("media") || reason.includes("url")) return "storage";
    if (reason.includes("watch") || reason.includes("viewer") || reason.includes("visibility")) return "viewer";
    return "legacy";
}

export function normalizeModerationEvidence(id: string, value: Record<string, unknown>): ModerationEvidence {
    const rawReason = toStringValue(value.reason ?? value.rawReason ?? value.eventType) || "unknown";
    const normalizedReason = rawReason.toLowerCase().replace(/\s+/g, "_");
    const source = normalizeSource(value.source, normalizedReason);
    const confidence = normalizeConfidence(value.confidence);
    const observedAt = toNumber(value.timestamp ?? value.observedAt ?? value.createdAt) || Date.now();

    return {
        id,
        userId: toStringValue(value.userId) || undefined,
        sessionId: toStringValue(value.sessionId) || undefined,
        anonymousVisitorId: toStringValue(value.anonymousVisitorId) || undefined,
        creatorId: toStringValue(value.creatorId) || undefined,
        dropId: toStringValue(value.dropId) || undefined,
        fileId: toStringValue(value.fileId) || undefined,
        assetKey: toStringValue(value.assetKey) || undefined,
        viewerSessionId: toStringValue(value.viewerSessionId) || undefined,
        watchSessionId: toStringValue(value.watchSessionId) || undefined,
        route: toStringValue(value.route ?? value.pagePath) || undefined,
        source,
        eventType: toStringValue(value.eventType) || normalizedReason,
        observedAt,
        confidence,
        rawReason,
        normalizedReason,
        humanSummary: toStringValue(value.humanSummary ?? value.message ?? value.label) || "Moderation evidence was recorded.",
        weight: Math.max(0, toNumber(value.weight)),
        falsePositiveRisk: value.falsePositiveRisk === "low" || value.falsePositiveRisk === "medium" || value.falsePositiveRisk === "high" || value.falsePositiveRisk === "unknown"
            ? value.falsePositiveRisk
            : confidence === "confirmed"
                ? "low"
                : confidence === "heuristic"
                    ? "high"
                    : "unknown",
        safeDetails: {
            source,
            route: toStringValue(value.route ?? value.pagePath) || null,
            dropId: toStringValue(value.dropId) || null,
            fileId: toStringValue(value.fileId) || null,
            assetKey: toStringValue(value.assetKey) || null,
            repeatCount: toNumber(value.repeatCount) || 1,
            detectionKind: toStringValue(value.detectionKind) || null,
        },
    };
}
