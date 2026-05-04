import {
    computeLiteralValidWatchMs,
    IMAGE_WATCH_THRESHOLDS_MS,
    isImageCompletionEligible,
    isVideoCompletionEligible,
    VIDEO_WATCH_THRESHOLDS,
} from "@/lib/behavioral/watch-time-truth";

export const WATCH_SCORE_TIERS = ["none", "skim", "viewed", "engaged", "completed"] as const;

export type WatchScoreTier = (typeof WATCH_SCORE_TIERS)[number];
export type WatchScoreMediaType = "image" | "video" | "unknown";

export interface WatchScoreInput {
    mediaType: WatchScoreMediaType;
    visibleMs?: number | null;
    activeMs?: number | null;
    playingMs?: number | null;
    hiddenMs?: number | null;
    idleMs?: number | null;
    maxProgressPercent?: number | null;
    completed?: boolean | null;
    manualAdvanceAfterMs?: number | null;
}

export interface WatchScore {
    score: number;
    tier: WatchScoreTier;
    validWatchMs: number;
    visibleMs: number;
    activeMs: number;
    playingMs: number;
    completionCredit: boolean;
    reasonCodes: string[];
}

export interface WatchInterval {
    startedAtMs: number;
    endedAtMs: number;
}

function normalizeMs(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }

    return Math.round(numeric);
}

function normalizeProgressPercent(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, numeric));
}

function uniqueReasonCodes(reasonCodes: string[]) {
    return Array.from(new Set(reasonCodes.filter(Boolean))).sort();
}

export function computeWatchScore(input: WatchScoreInput): WatchScore {
    const visibleMs = normalizeMs(input.visibleMs);
    const activeMs = normalizeMs(input.activeMs);
    const playingMs = normalizeMs(input.playingMs);
    const hiddenMs = normalizeMs(input.hiddenMs);
    const idleMs = normalizeMs(input.idleMs);
    const maxProgressPercent = normalizeProgressPercent(input.maxProgressPercent);
    const mediaType = input.mediaType === "video" || input.mediaType === "image" ? input.mediaType : "unknown";
    const reasonCodes: string[] = [];

    if (hiddenMs > 0) {
        reasonCodes.push("hidden_time_excluded");
    }
    if (idleMs > 0) {
        reasonCodes.push("idle_time_excluded");
    }
    if (visibleMs <= 0) {
        reasonCodes.push("no_visible_content_time");
    }

    const validWatchMs = computeLiteralValidWatchMs({
        mediaType,
        visibleMs,
        activeMs,
        playingMs,
    });
    const completionCredit = mediaType === "video"
        ? isVideoCompletionEligible({
            progressPercent: maxProgressPercent,
            completed: input.completed === true,
        })
        : mediaType === "image"
            ? isImageCompletionEligible({
                validWatchMs,
                manualAdvanceAfterMs: input.manualAdvanceAfterMs,
                completed: input.completed === true,
            })
            : Boolean(input.completed);

    if (mediaType === "video") {
        if (playingMs > 0) {
            reasonCodes.push("video_playing_time_counted");
        }
        if (maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.completedProgressPercent) {
            reasonCodes.push("video_progress_90_percent");
        } else if (maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.engagedProgressPercent) {
            reasonCodes.push("video_progress_50_percent");
        } else if (maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.viewedProgressPercent) {
            reasonCodes.push("video_progress_20_percent");
        }
    }

    if (mediaType === "image" && validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.viewed) {
        reasonCodes.push("image_minimum_visible_time_met");
    }
    if (mediaType === "image" && normalizeMs(input.manualAdvanceAfterMs) >= IMAGE_WATCH_THRESHOLDS_MS.manualAdvanceCompleted) {
        reasonCodes.push("image_manual_advance_completion");
    }

    let tier: WatchScoreTier = "none";
    let score = 0;

    if (completionCredit) {
        tier = "completed";
        score = 100;
    } else if (mediaType === "video" && maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.engagedProgressPercent) {
        tier = "engaged";
        score = Math.max(70, Math.round(maxProgressPercent));
    } else if ((mediaType === "video" && maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.viewedProgressPercent) || (mediaType === "image" && validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.engaged) || validWatchMs >= 15_000) {
        if (mediaType === "video" && maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.viewedProgressPercent) {
            tier = maxProgressPercent >= VIDEO_WATCH_THRESHOLDS.engagedProgressPercent ? "engaged" : "viewed";
            score = tier === "engaged" ? Math.max(70, Math.round(maxProgressPercent)) : 55;
        } else {
            tier = "engaged";
            score = 70;
        }
    } else if (mediaType === "video" && validWatchMs >= VIDEO_WATCH_THRESHOLDS.viewedMs) {
        tier = "viewed";
        score = 50;
    } else if (mediaType === "image" && validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.viewed) {
        tier = "viewed";
        score = 45;
    } else if (validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.skim) {
        tier = "skim";
        score = 20;
    } else {
        reasonCodes.push("below_minimum_watch_threshold");
    }

    if (mediaType === "image" && validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.engaged && tier === "viewed") {
        tier = "engaged";
        score = 70;
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        tier,
        validWatchMs,
        visibleMs,
        activeMs,
        playingMs,
        completionCredit,
        reasonCodes: uniqueReasonCodes(reasonCodes),
    };
}

export function sumNonOverlappingWatchIntervals(intervals: WatchInterval[]) {
    const normalized = intervals
        .map((interval) => ({
            startedAtMs: normalizeMs(interval.startedAtMs),
            endedAtMs: normalizeMs(interval.endedAtMs),
        }))
        .filter((interval) => interval.endedAtMs > interval.startedAtMs)
        .sort((left, right) => left.startedAtMs - right.startedAtMs || left.endedAtMs - right.endedAtMs);

    let totalMs = 0;
    let currentStart: number | null = null;
    let currentEnd: number | null = null;

    for (const interval of normalized) {
        if (currentStart === null || currentEnd === null) {
            currentStart = interval.startedAtMs;
            currentEnd = interval.endedAtMs;
            continue;
        }

        if (interval.startedAtMs <= currentEnd) {
            currentEnd = Math.max(currentEnd, interval.endedAtMs);
            continue;
        }

        totalMs += currentEnd - currentStart;
        currentStart = interval.startedAtMs;
        currentEnd = interval.endedAtMs;
    }

    if (currentStart !== null && currentEnd !== null) {
        totalMs += currentEnd - currentStart;
    }

    return totalMs;
}
