// @vitest-environment happy-dom

import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RuntimeWatchTracker } from "@/components/Analytics/RuntimeWatchTracker";
import type { RuntimeWatchEvent } from "@/lib/analytics/runtime-watch-time-v2";

function defineMediaState(
  media: HTMLVideoElement,
  state: {
    paused?: boolean;
    currentTime?: number;
    duration?: number;
    muted?: boolean;
    playbackRate?: number;
  },
) {
  for (const [key, value] of Object.entries(state)) {
    Object.defineProperty(media, key, {
      configurable: true,
      get: () => value,
    });
  }
}

function setupTracker(onWatchEvent = vi.fn()) {
  const ref = createRef<HTMLVideoElement>();
  const rendered = render(
    <>
      <video ref={ref} />
      <RuntimeWatchTracker
        mediaRef={ref}
        mediaId="media_1"
        surface="drop_viewer"
        route="/dashboard/viewer/drop_1"
        guestId="guest_1"
        userId={null}
        sessionId="session_1"
        identityState="guest_only"
        onWatchEvent={onWatchEvent}
      />
    </>,
  );

  if (!ref.current) {
    throw new Error("media ref missing");
  }

  defineMediaState(ref.current, {
    paused: true,
    currentTime: 0,
    duration: 60,
    muted: false,
    playbackRate: 1,
  });

  return { ...rendered, media: ref.current, onWatchEvent };
}

describe("RuntimeWatchTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops heartbeat intervals on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { media, unmount } = setupTracker();
    defineMediaState(media, { paused: false, currentTime: 0, duration: 60 });

    act(() => {
      media.dispatchEvent(new Event("play"));
    });
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("emits heartbeat only while media is playing and visible", () => {
    const { media, onWatchEvent } = setupTracker();
    defineMediaState(media, { paused: false, currentTime: 0, duration: 60 });

    act(() => {
      media.dispatchEvent(new Event("play"));
      vi.advanceTimersByTime(10_000);
    });

    const eventTypes = onWatchEvent.mock.calls.map((call) => (call[0] as RuntimeWatchEvent).eventType);
    expect(eventTypes).toContain("watch_start");
    expect(eventTypes).toContain("watch_heartbeat");
  });

  it("emits pause and pagehide events", () => {
    const { media, onWatchEvent } = setupTracker();
    defineMediaState(media, { paused: false, currentTime: 5, duration: 60 });

    act(() => {
      media.dispatchEvent(new Event("play"));
      media.dispatchEvent(new Event("pause"));
      window.dispatchEvent(new Event("pagehide"));
    });

    const eventTypes = onWatchEvent.mock.calls.map((call) => (call[0] as RuntimeWatchEvent).eventType);
    expect(eventTypes).toContain("watch_pause");
    expect(eventTypes).toContain("watch_abandon");
  });
});
