"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";

import {
  RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS,
  type RuntimeWatchEvent,
  type RuntimeWatchEventType,
} from "@/lib/analytics/runtime-watch-time-v2";
import type { AnalyticsIdentityState } from "@/lib/analytics/analytics-event-contract";

type RuntimeWatchTrackerProps = {
  mediaRef: RefObject<HTMLMediaElement | null>;
  mediaId: string;
  surface: string;
  route: string;
  watchSessionId?: string;
  guestId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  identityState: AnalyticsIdentityState;
  disabled?: boolean;
  heartbeatIntervalMs?: number;
  onWatchEvent?: (event: RuntimeWatchEvent) => void | Promise<void>;
  ingestEndpoint?: string | null;
};

function createFallbackWatchSessionId(mediaId: string, sessionId?: string | null) {
  return [
    "runtime_watch",
    (sessionId || "session").replace(/[^A-Za-z0-9_-]/gu, "_"),
    mediaId.replace(/[^A-Za-z0-9_-]/gu, "_"),
  ].join("_").slice(0, 160);
}

function readVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function readActive() {
  return typeof document === "undefined" || typeof document.hasFocus !== "function" || document.hasFocus();
}

function readDurationMs(media: HTMLMediaElement) {
  return Number.isFinite(media.duration) && media.duration > 0 ? Math.round(media.duration * 1000) : 0;
}

function readPlayheadMs(media: HTMLMediaElement) {
  return Number.isFinite(media.currentTime) && media.currentTime > 0 ? Math.round(media.currentTime * 1000) : 0;
}

export function RuntimeWatchTracker({
  mediaRef,
  mediaId,
  surface,
  route,
  watchSessionId,
  guestId = null,
  userId = null,
  sessionId = null,
  identityState,
  disabled = false,
  heartbeatIntervalMs = RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS,
  onWatchEvent,
  ingestEndpoint = null,
}: RuntimeWatchTrackerProps) {
  const resolvedWatchSessionId = useMemo(
    () => watchSessionId || createFallbackWatchSessionId(mediaId, sessionId),
    [mediaId, sessionId, watchSessionId],
  );
  const sequenceRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const lastEmitAtRef = useRef<number>(0);
  const startedRef = useRef(false);

  const clearHeartbeat = useCallback(() => {
    if (intervalRef.current !== null && typeof window !== "undefined") {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const submitWatchEvent = useCallback((event: RuntimeWatchEvent, preferBeacon: boolean) => {
    if (onWatchEvent) {
      void onWatchEvent(event);
      return;
    }

    if (!ingestEndpoint || typeof window === "undefined") {
      return;
    }

    const body = JSON.stringify({ runtimeWatchEvent: event });
    if (preferBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(ingestEndpoint, new Blob([body], { type: "application/json" }));
      if (sent) {
        return;
      }
    }

    void fetch(ingestEndpoint, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  }, [ingestEndpoint, onWatchEvent]);

  const emitWatchEvent = useCallback((eventType: RuntimeWatchEventType, options: { preferBeacon?: boolean } = {}) => {
    const media = mediaRef.current;
    if (!media || disabled) {
      return;
    }

    const now = Date.now();
    const elapsed = lastEmitAtRef.current > 0 ? now - lastEmitAtRef.current : 0;
    lastEmitAtRef.current = now;
    sequenceRef.current += 1;

    const event: RuntimeWatchEvent = {
      watchSessionId: resolvedWatchSessionId,
      mediaId,
      surface,
      route,
      guestId,
      userId,
      sessionId,
      identityState,
      mediaDurationMs: readDurationMs(media),
      playheadMs: readPlayheadMs(media),
      playbackRate: Number.isFinite(media.playbackRate) && media.playbackRate > 0 ? media.playbackRate : 1,
      muted: media.muted === true,
      visible: readVisible(),
      active: readActive(),
      eventType,
      clientElapsedMs: Math.max(0, elapsed),
      clientEventAt: new Date(now).toISOString(),
      eventId: `${resolvedWatchSessionId}:${sequenceRef.current}:${eventType}`,
      sequence: sequenceRef.current,
    };

    submitWatchEvent(event, options.preferBeacon === true);
  }, [disabled, guestId, identityState, mediaId, mediaRef, resolvedWatchSessionId, route, sessionId, submitWatchEvent, surface, userId]);

  const startHeartbeat = useCallback(() => {
    const media = mediaRef.current;
    if (!media || disabled || media.paused || !readVisible()) {
      return;
    }

    clearHeartbeat();
    intervalRef.current = window.setInterval(() => {
      const current = mediaRef.current;
      if (!current || current.paused || !readVisible()) {
        clearHeartbeat();
        return;
      }
      emitWatchEvent("watch_heartbeat");
    }, Math.max(heartbeatIntervalMs, RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS));
  }, [clearHeartbeat, disabled, emitWatchEvent, heartbeatIntervalMs, mediaRef]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || disabled) {
      return undefined;
    }

    const handlePlay = () => {
      emitWatchEvent(startedRef.current ? "watch_resume" : "watch_start");
      startedRef.current = true;
      startHeartbeat();
    };
    const handlePause = () => {
      clearHeartbeat();
      emitWatchEvent("watch_pause");
    };
    const handleEnded = () => {
      clearHeartbeat();
      emitWatchEvent("watch_complete");
    };
    const handleVisibilityChange = () => {
      if (!readVisible()) {
        clearHeartbeat();
        emitWatchEvent("watch_pause");
        return;
      }
      startHeartbeat();
    };
    const handlePageHide = () => {
      clearHeartbeat();
      emitWatchEvent("watch_abandon", { preferBeacon: true });
    };

    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);
    media.addEventListener("ended", handleEnded);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearHeartbeat();
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("ended", handleEnded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [clearHeartbeat, disabled, emitWatchEvent, mediaRef, startHeartbeat]);

  return null;
}
