import { describe, expect, it } from "vitest";

import {
    deriveViewerWatchCaptureState,
    getViewerAssetLiteralWatchMs,
    resolveViewerWatchSeconds,
    shouldCompleteImageOnManualAdvance,
    shouldRetryViewerWatchCloseFlush,
} from "@/lib/viewer-watch-session";

describe("resolveViewerWatchSeconds", () => {
    it("keeps media watch time aligned to playback progress", () => {
        expect(resolveViewerWatchSeconds({
            contentKind: "video",
            watchSeconds: 12.4,
            assetStartedAtMs: 1_000,
            nowMs: 9_000,
        })).toBe(12.4);
    });

    it("does not infer static watch time from elapsed wall-clock time", () => {
        expect(resolveViewerWatchSeconds({
            contentKind: "image",
            watchSeconds: 6,
            assetStartedAtMs: 1_000,
            nowMs: 13_500,
        })).toBe(6);
    });

    it("falls back to the reported bucket when no asset start timestamp exists", () => {
        expect(resolveViewerWatchSeconds({
            contentKind: "pdf",
            watchSeconds: 6,
            assetStartedAtMs: null,
            nowMs: 13_500,
        })).toBe(6);
    });

    it("computes literal image watch time from active foreground visibility", () => {
        expect(getViewerAssetLiteralWatchMs({
            contentKind: "image",
            totalVisibleSeconds: 10,
            totalActiveSeconds: 8,
            totalPlayingSeconds: 0,
        })).toBe(8000);
    });

    it("allows manual image completion only after 8 seconds", () => {
        expect(shouldCompleteImageOnManualAdvance({
            contentKind: "image",
            totalVisibleSeconds: 8,
            totalActiveSeconds: 8,
            totalPlayingSeconds: 0,
        })).toBe(true);
    });
});

describe("shouldRetryViewerWatchCloseFlush", () => {
    it("keeps the close intent alive after a failed terminal flush", () => {
        expect(shouldRetryViewerWatchCloseFlush({
            close: true,
            flushSucceeded: false,
            activeSessionMatches: true,
        })).toBe(true);
    });

    it("does not retry a non-close flush as terminal work", () => {
        expect(shouldRetryViewerWatchCloseFlush({
            close: false,
            flushSucceeded: false,
            activeSessionMatches: true,
        })).toBe(false);
    });
});

describe("deriveViewerWatchCaptureState", () => {
    it("keeps replay-recovered sessions labeled without counting them as degraded", () => {
        expect(deriveViewerWatchCaptureState({
            replayRecovered: true,
            replayRecoveredCount: 1,
            gapCount: 0,
            flushFailureCount: 0,
            isClosed: true,
            closeReason: "viewer_unmounted",
        })).toMatchObject({
            captureQuality: "replayed",
            replayRecovered: true,
            degraded: false,
            closeMissing: false,
            flushDegraded: false,
            gapDetected: false,
        });
    });

    it("keeps unresolved gap capture marked as degraded", () => {
        expect(deriveViewerWatchCaptureState({
            replayRecovered: true,
            replayRecoveredCount: 2,
            gapCount: 1,
            flushFailureCount: 0,
            isClosed: true,
            closeReason: "page_exit",
        })).toMatchObject({
            captureQuality: "gap_detected",
            replayRecovered: true,
            degraded: true,
            gapDetected: true,
        });
    });
});
