import { describe, expect, it } from "vitest";

import { computeWatchScore, sumNonOverlappingWatchIntervals } from "@/lib/watch-time-scoring";

describe("computeWatchScore", () => {
    it("scores 0ms as none", () => {
        expect(computeWatchScore({ mediaType: "image", visibleMs: 0, activeMs: 0 }).tier).toBe("none");
    });

    it("scores 500ms as none", () => {
        expect(computeWatchScore({ mediaType: "image", visibleMs: 500, activeMs: 500 }).tier).toBe("none");
    });

    it("scores 2500ms image as skim", () => {
        expect(computeWatchScore({ mediaType: "image", visibleMs: 2500, activeMs: 2500 }).tier).toBe("skim");
    });

    it("scores 6000ms image visible active as viewed", () => {
        expect(computeWatchScore({ mediaType: "image", visibleMs: 6000, activeMs: 6000 })).toMatchObject({
            tier: "viewed",
            validWatchMs: 6000,
        });
    });

    it("scores 15000ms image active as completed", () => {
        expect(computeWatchScore({ mediaType: "image", visibleMs: 15000, activeMs: 15000 })).toMatchObject({
            tier: "completed",
            completionCredit: true,
        });
    });

    it("scores video 10s with 20% progress as viewed", () => {
        expect(computeWatchScore({
            mediaType: "video",
            visibleMs: 10000,
            activeMs: 10000,
            playingMs: 10000,
            maxProgressPercent: 20,
        }).tier).toBe("viewed");
    });

    it("scores video 50% progress as engaged", () => {
        expect(computeWatchScore({
            mediaType: "video",
            visibleMs: 5000,
            activeMs: 5000,
            playingMs: 5000,
            maxProgressPercent: 50,
        })).toMatchObject({
            tier: "engaged",
            reasonCodes: expect.arrayContaining(["video_progress_50_percent"]),
        });
    });

    it("scores video 90% progress as completed", () => {
        expect(computeWatchScore({
            mediaType: "video",
            visibleMs: 5000,
            activeMs: 5000,
            playingMs: 5000,
            maxProgressPercent: 90,
        })).toMatchObject({
            tier: "completed",
            completionCredit: true,
            reasonCodes: expect.arrayContaining(["video_progress_90_percent"]),
        });
    });

    it("excludes hidden time from fallback visible watch", () => {
        expect(computeWatchScore({
            mediaType: "image",
            visibleMs: 6000,
            hiddenMs: 5000,
        })).toMatchObject({
            tier: "skim",
            validWatchMs: 1000,
            reasonCodes: expect.arrayContaining(["hidden_time_excluded"]),
        });
    });

    it("excludes idle time from fallback visible watch", () => {
        expect(computeWatchScore({
            mediaType: "image",
            visibleMs: 6000,
            idleMs: 5000,
        })).toMatchObject({
            tier: "skim",
            validWatchMs: 1000,
            reasonCodes: expect.arrayContaining(["idle_time_excluded"]),
        });
    });

    it("does not double-count overlapping sessions", () => {
        expect(sumNonOverlappingWatchIntervals([
            { startedAtMs: 0, endedAtMs: 5000 },
            { startedAtMs: 2500, endedAtMs: 8000 },
            { startedAtMs: 10000, endedAtMs: 12000 },
        ])).toBe(10000);
    });
});
