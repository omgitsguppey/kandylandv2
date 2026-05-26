import { describe, expect, it } from "vitest";

import {
  calculateActiveWatchMs,
  calculateNormalizedWatchPercent,
  calculateStaticDropWatch,
  classifyDropAction,
  classifyWatchCompletion,
  classifyWatchConfidence,
  explainWatchCalculation,
  validateUnlockUnwrapSeparation,
} from "@/lib/math/drop-watch-unlock-math";

describe("drop watch unlock math", () => {
  it("separates drop open, unlock, unwrap, and watch actions", () => {
    expect(classifyDropAction({ eventName: "drop_opened" })).toBe("drop_opened");
    expect(classifyDropAction({ eventName: "drop_unlocked", entitlementGranted: true })).toBe("drop_unlocked");
    expect(classifyDropAction({ eventName: "drop_unwrapped", payloadRevealed: true })).toBe("drop_unwrapped");
    expect(classifyDropAction({ eventName: "watch_started", unlocked: true, renderedVisible: true })).toBe("watch_started");

    expect(validateUnlockUnwrapSeparation({
      unlockEventName: "drop_unlocked",
      unwrapEventName: "drop_unwrapped",
      entitlementGranted: true,
      payloadRevealSource: "viewer_payload_rendered",
    })).toMatchObject({ valid: true, unlockEqualsUnwrap: false });
  });

  it("rejects locked previews and page duration as watch time", () => {
    const activeWatchMs = calculateActiveWatchMs({
      mediaKind: "video",
      unlocked: true,
      renderedVisible: true,
      playbackIntervals: [
        { startedAtMs: 0, endedAtMs: 8_000, documentVisible: true, mediaPlaying: true },
        { startedAtMs: 8_000, endedAtMs: 20_000, documentVisible: false, mediaPlaying: true },
      ],
      pageDurationMs: 120_000,
    });

    expect(activeWatchMs).toBe(8_000);
    expect(calculateActiveWatchMs({
      mediaKind: "video",
      unlocked: false,
      lockedPreview: true,
      renderedVisible: true,
      playbackIntervals: [{ startedAtMs: 0, endedAtMs: 10_000, documentVisible: true, mediaPlaying: true }],
      pageDurationMs: 120_000,
    })).toBe(0);
    expect(explainWatchCalculation({ mediaKind: "video", pageDurationMs: 120_000 })).toContain("PageDurationMs rejected");
  });

  it("normalizes media watch to 0..1 and classifies replay separately", () => {
    const activeWatchMs = calculateActiveWatchMs({
      mediaKind: "video",
      unlocked: true,
      renderedVisible: true,
      playbackIntervals: [
        { startedAtMs: 0, endedAtMs: 12_000, documentVisible: true, mediaPlaying: true },
        { startedAtMs: 20_000, endedAtMs: 32_000, documentVisible: true, mediaPlaying: true, restartedAfterCompletion: true },
      ],
      contentDurationMs: 10_000,
    });

    expect(activeWatchMs).toBe(24_000);
    expect(calculateNormalizedWatchPercent({ activeWatchMs, contentDurationMs: 10_000 })).toBe(1);
    expect(classifyWatchCompletion({ mediaKind: "video", activeWatchMs, contentDurationMs: 10_000 })).toMatchObject({
      completed: true,
      replayCount: 1,
      normalizedWatchPercent: 1,
    });
  });

  it("caps static continuous exposure unless there is interaction", () => {
    const passiveStatic = calculateStaticDropWatch({
      mediaKind: "image",
      unlocked: true,
      renderedVisible: true,
      activeVisibleIntervals: [{ startedAtMs: 0, endedAtMs: 45_000, documentVisible: true, userActive: true }],
      interacted: false,
    });
    const interactedStatic = calculateStaticDropWatch({
      mediaKind: "image",
      unlocked: true,
      renderedVisible: true,
      activeVisibleIntervals: [{ startedAtMs: 0, endedAtMs: 45_000, documentVisible: true, userActive: true }],
      interacted: true,
    });

    expect(passiveStatic.activeWatchMs).toBe(30_000);
    expect(interactedStatic.activeWatchMs).toBe(45_000);
    expect(passiveStatic.normalizedWatchPercent).toBe(1);
    expect(classifyWatchCompletion({ mediaKind: "image", activeWatchMs: 5_000 })).toMatchObject({ completed: true });
  });

  it("classifies confidence from runtime source quality", () => {
    expect(classifyWatchConfidence({
      mediaKind: "video",
      activeWatchMs: 9_000,
      contentDurationMs: 10_000,
      playbackEventsPresent: true,
    })).toBe("exact_media_runtime");
    expect(classifyWatchConfidence({
      mediaKind: "image",
      activeWatchMs: 5_000,
      renderedVisible: true,
      interacted: true,
    })).toBe("active_visibility_estimated");
    expect(classifyWatchConfidence({
      mediaKind: "image",
      activeWatchMs: 5_000,
      renderedVisible: true,
      interacted: false,
    })).toBe("weak_visibility_only");
    expect(classifyWatchConfidence({ mediaKind: "video", activeWatchMs: 0 })).toBe("unavailable");
  });
});
