import { normalizeCreatorSettings } from "@/lib/creator-experiences";

export type CreatorBroadcastAudience = "followers" | "fan_pass_subscribers" | "followers_and_subscribers";
export type CreatorBroadcastStatus = "draft" | "published" | "queued" | "failed";

export type CreatorBroadcastSourceRecord = {
    broadcastId: string;
    creatorId: string;
    creatorDisplayName: string;
    creatorUsername: string;
    title: string;
    body: string;
    message: string;
    audience: CreatorBroadcastAudience;
    status: CreatorBroadcastStatus;
    notifyFollowers: boolean;
    timelineEligible: boolean;
    createdAtMs: number;
    publishedAtMs: number | null;
    sourceTruth: "creator_broadcast_source_record";
};

export const CREATOR_BROADCAST_AUDIENCES: CreatorBroadcastAudience[] = [
    "followers",
    "fan_pass_subscribers",
    "followers_and_subscribers",
];

export function normalizeCreatorBroadcastAudience(value: unknown): CreatorBroadcastAudience {
    if (value === "fan_pass_subscribers" || value === "followers_and_subscribers") {
        return value;
    }

    return "followers";
}

export function resolveCreatorBroadcastAudience(input: {
    requestedAudience?: unknown;
    target?: unknown;
    creatorSettings?: unknown;
}) {
    const settings = normalizeCreatorSettings(input.creatorSettings);
    const requested = input.requestedAudience ?? input.target ?? settings.broadcastDefaultAudience;
    const audience = normalizeCreatorBroadcastAudience(requested);

    return {
        audience,
        source: requested ? "request" as const : "creator_settings" as const,
        defaultAudience: settings.broadcastDefaultAudience,
        supportedAudiences: CREATOR_BROADCAST_AUDIENCES,
    };
}

export function buildCreatorBroadcastSourceRecord(input: {
    broadcastId: string;
    creatorId: string;
    creatorDisplayName: string;
    creatorUsername?: string | null;
    title?: string | null;
    body?: string | null;
    message?: string | null;
    audience?: unknown;
    status?: CreatorBroadcastStatus;
    notifyFollowers?: boolean;
    timelineEligible?: boolean;
    createdAtMs: number;
}): CreatorBroadcastSourceRecord {
    const body = (input.body ?? input.message ?? "").trim();
    const title = (input.title ?? "").trim() || `New update from ${input.creatorDisplayName}`;
    const status = input.status ?? "published";
    return {
        broadcastId: input.broadcastId,
        creatorId: input.creatorId,
        creatorDisplayName: input.creatorDisplayName,
        creatorUsername: input.creatorUsername?.trim() ?? "",
        title,
        body,
        message: body,
        audience: normalizeCreatorBroadcastAudience(input.audience),
        status,
        notifyFollowers: input.notifyFollowers !== false,
        timelineEligible: input.timelineEligible !== false && status === "published",
        createdAtMs: input.createdAtMs,
        publishedAtMs: status === "published" ? input.createdAtMs : null,
        sourceTruth: "creator_broadcast_source_record",
    };
}
