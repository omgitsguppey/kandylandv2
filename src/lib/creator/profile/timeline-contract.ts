import { normalizeCreatorSettings } from "@/lib/creator-experiences";

export type CreatorProfileTimelineItemType = "drop" | "broadcast";

export type CreatorProfileTimelineItem = {
    id: string;
    type: CreatorProfileTimelineItemType;
    title: string;
    body: string;
    createdAtMs: number;
    sourceTruth: "approved_public_drop" | "published_creator_broadcast";
};

export type CreatorProfileTimeline = {
    items: CreatorProfileTimelineItem[];
    sourceTruth: "creator_profile_timeline_contract";
    state: "source_ready" | "disabled" | "empty";
    excludedCounts: {
        pendingDrops: number;
        draftBroadcasts: number;
    };
};

function readString(source: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }
    return "";
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }
    return 0;
}

function normalizeDropTimelineItem(raw: Record<string, unknown>): CreatorProfileTimelineItem | null {
    const status = readString(raw, "status");
    const hidden = raw.publicDiscovery === false || raw.visibility === "private";
    if (status && status !== "active") {
        return null;
    }
    if (hidden) {
        return null;
    }

    const id = readString(raw, "id", "dropId");
    if (!id) {
        return null;
    }

    return {
        id,
        type: "drop",
        title: readString(raw, "title") || "Creator drop",
        body: readString(raw, "description", "summary"),
        createdAtMs: readNumber(raw, "validFrom", "createdAtMs", "publishedAtMs"),
        sourceTruth: "approved_public_drop",
    };
}

function normalizeBroadcastTimelineItem(raw: Record<string, unknown>): CreatorProfileTimelineItem | null {
    const status = readString(raw, "status") || "draft";
    if (status !== "published" && status !== "sent") {
        return null;
    }
    if (raw.timelineEligible === false || raw.removedAt !== undefined) {
        return null;
    }

    const id = readString(raw, "broadcastId", "id");
    if (!id) {
        return null;
    }

    return {
        id,
        type: "broadcast",
        title: readString(raw, "title") || "Creator update",
        body: readString(raw, "body", "message"),
        createdAtMs: readNumber(raw, "publishedAtMs", "createdAtMs", "sentAtMs"),
        sourceTruth: "published_creator_broadcast",
    };
}

export function buildCreatorProfileTimeline(input: {
    settings: unknown;
    drops: Array<Record<string, unknown>>;
    broadcasts: Array<Record<string, unknown>>;
}): CreatorProfileTimeline {
    const settings = normalizeCreatorSettings(input.settings);
    const timelineEnabled = settings.profileTimelineEnabled !== false;
    const includeDrops = timelineEnabled && settings.showApprovedDropsOnTimeline !== false;
    const includeBroadcasts = timelineEnabled && settings.showBroadcastsOnTimeline !== false;
    const excludedCounts = {
        pendingDrops: 0,
        draftBroadcasts: 0,
    };

    if (!timelineEnabled) {
        return {
            items: [],
            sourceTruth: "creator_profile_timeline_contract",
            state: "disabled",
            excludedCounts,
        };
    }

    const dropItems = includeDrops
        ? input.drops.flatMap((drop) => {
            const item = normalizeDropTimelineItem(drop);
            if (!item) {
                excludedCounts.pendingDrops += 1;
                return [];
            }
            return [item];
        })
        : [];
    const broadcastItems = includeBroadcasts
        ? input.broadcasts.flatMap((broadcast) => {
            const item = normalizeBroadcastTimelineItem(broadcast);
            if (!item) {
                excludedCounts.draftBroadcasts += 1;
                return [];
            }
            return [item];
        })
        : [];
    const items = [...dropItems, ...broadcastItems]
        .sort((left, right) => right.createdAtMs - left.createdAtMs);

    return {
        items,
        sourceTruth: "creator_profile_timeline_contract",
        state: items.length > 0 ? "source_ready" : "empty",
        excludedCounts,
    };
}
