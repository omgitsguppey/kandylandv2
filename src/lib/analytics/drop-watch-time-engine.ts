import {
  normalizeDropWatchMediaKind,
  type DropWatchConfidence,
  type DropWatchMediaKind,
  type DropWatchSessionStatus,
  type DropWatchTimeSession,
  type DropWatchTimeTelemetryEvent,
} from "@/lib/analytics/drop-watch-time-contract";
import {
  calculateNormalizedWatchPercent as calculateCanonicalNormalizedWatchPercent,
  calculateStaticDropWatch,
  classifyWatchCompletion,
  classifyWatchConfidence as classifyCanonicalWatchConfidence,
} from "@/lib/math/drop-watch-unlock-math";

export const DROP_WATCH_PROGRESS_THROTTLE_MS = 15_000;

type StartDropWatchSessionInput = {
  dropId: string;
  mediaId: string;
  mediaKind: DropWatchMediaKind | string;
  contentDurationMs?: number | null;
  visibleStartedAt?: number | null;
  activeStartedAt?: number | null;
  playbackStartedAt?: number | null;
  dedupeKey?: string | null;
};

type ProgressInput = {
  nowMs?: number | null;
  visibleMsDelta?: number | null;
  activeMsDelta?: number | null;
  playingMsDelta?: number | null;
  passiveVisibleMsDelta?: number | null;
  backgroundMsDelta?: number | null;
  playbackPositionMs?: number | null;
  replayCount?: number | null;
};

function normalizeMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
}

function normalizeCount(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.trunc(numeric);
}

function boundedPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function isMediaRuntimeKind(mediaKind: DropWatchMediaKind) {
  return mediaKind === "video" || mediaKind === "audio";
}

function normalizeDuration(value: unknown) {
  const duration = normalizeMs(value);
  return duration > 0 ? duration : null;
}

function buildDedupeKey(input: StartDropWatchSessionInput) {
  if (input.dedupeKey && String(input.dedupeKey).trim()) return String(input.dedupeKey).trim();
  return [input.dropId, input.mediaId, normalizeDropWatchMediaKind(input.mediaKind)].join(":");
}

function durationBiasPolicyFor(input: Pick<DropWatchTimeSession, "mediaKind" | "contentDurationMs" | "watchConfidence">) {
  if (!input.contentDurationMs) {
    return "duration_unavailable_no_exact_percent";
  }
  if (isMediaRuntimeKind(input.mediaKind)) {
    return "normalize_playback_against_media_duration_cap_per_replay";
  }
  if (input.mediaKind === "image") {
    return "normalize_active_visible_dwell_against_expected_image_duration";
  }
  return input.watchConfidence === "weak_visibility_only"
    ? "weak_visibility_only_no_duration_bias_claim"
    : "normalize_active_engagement_against_content_duration";
}

export function calculateActiveWatchMs(input: DropWatchTimeSession) {
  return Math.max(0, Math.round(input.activeWatchMs));
}

export function calculateNormalizedWatchPercent(input: DropWatchTimeSession) {
  return calculateCanonicalNormalizedWatchPercent({
    activeWatchMs: input.activeWatchMs,
    contentDurationMs: input.contentDurationMs,
    mediaKind: input.mediaKind,
  });
}

export function classifyWatchConfidence(input: Pick<DropWatchTimeSession, "mediaKind" | "contentDurationMs" | "activeWatchMs">): DropWatchConfidence {
  return classifyCanonicalWatchConfidence({
    mediaKind: input.mediaKind,
    activeWatchMs: input.activeWatchMs,
    contentDurationMs: input.contentDurationMs,
    playbackEventsPresent: isMediaRuntimeKind(input.mediaKind) && input.activeWatchMs > 0,
    renderedVisible: input.activeWatchMs > 0,
    interacted: input.mediaKind === "image" && input.activeWatchMs > 0,
  });
}

export function startDropWatchSession(input: StartDropWatchSessionInput): DropWatchTimeSession {
  const mediaKind = normalizeDropWatchMediaKind(input.mediaKind);
  const session: DropWatchTimeSession = {
    dropId: input.dropId,
    mediaId: input.mediaId,
    mediaKind,
    contentDurationMs: normalizeDuration(input.contentDurationMs),
    visibleStartedAt: normalizeMs(input.visibleStartedAt) || null,
    activeStartedAt: normalizeMs(input.activeStartedAt) || null,
    playbackStartedAt: normalizeMs(input.playbackStartedAt) || null,
    playbackEndedAt: null,
    activeWatchMs: 0,
    passiveVisibleMs: 0,
    backgroundMs: 0,
    replayCount: 0,
    completionPercent: null,
    normalizedWatchPercent: null,
    watchConfidence: "unavailable",
    durationBiasPolicy: "duration_unavailable_no_exact_percent",
    dedupeKey: buildDedupeKey(input),
    status: "started",
  };

  return {
    ...session,
    durationBiasPolicy: durationBiasPolicyFor(session),
  };
}

export function updateDropWatchProgress(session: DropWatchTimeSession, progress: ProgressInput): DropWatchTimeSession {
  const replayCount = Math.max(session.replayCount, normalizeCount(progress.replayCount));
  const contentDurationMs = session.contentDurationMs;
  const visibleMs = normalizeMs(progress.visibleMsDelta);
  const activeMs = normalizeMs(progress.activeMsDelta);
  const playingMs = normalizeMs(progress.playingMsDelta);
  const backgroundMs = normalizeMs(progress.backgroundMsDelta);
  const passiveVisibleMs = normalizeMs(progress.passiveVisibleMsDelta)
    || Math.max(0, visibleMs - Math.max(activeMs, playingMs));
  const nextActiveWatchMs = session.activeWatchMs + (isMediaRuntimeKind(session.mediaKind) ? playingMs : activeMs);
  const capMs = contentDurationMs ? contentDurationMs * Math.max(1, replayCount || 1) : null;
  const activeWatchMs = session.mediaKind === "image"
    ? calculateStaticDropWatch({
      mediaKind: "image",
      unlocked: true,
      renderedVisible: true,
      activeVisibleMs: nextActiveWatchMs,
      contentDurationMs: contentDurationMs ?? undefined,
      interacted: false,
    }).activeWatchMs
    : capMs ? Math.min(nextActiveWatchMs, capMs) : nextActiveWatchMs;
  const playbackPositionMs = normalizeMs(progress.playbackPositionMs);
  const completionPercent = contentDurationMs
    ? boundedPercent((Math.min(playbackPositionMs || activeWatchMs, contentDurationMs) / contentDurationMs) * 100)
    : null;
  const partial: DropWatchTimeSession = {
    ...session,
    activeWatchMs,
    passiveVisibleMs: session.passiveVisibleMs + passiveVisibleMs,
    backgroundMs: session.backgroundMs + backgroundMs,
    replayCount,
    completionPercent,
    normalizedWatchPercent: null,
    playbackEndedAt: playbackPositionMs > 0 && contentDurationMs && playbackPositionMs >= contentDurationMs
      ? normalizeMs(progress.nowMs) || session.playbackEndedAt
      : session.playbackEndedAt,
    status: backgroundMs > 0 && activeWatchMs <= session.activeWatchMs ? "hidden" : "in_progress",
  };
  const watchConfidence = classifyWatchConfidence(partial);

  return {
    ...partial,
    watchConfidence,
    normalizedWatchPercent: calculateNormalizedWatchPercent({ ...partial, watchConfidence }),
    durationBiasPolicy: durationBiasPolicyFor({ ...partial, watchConfidence }),
  };
}

export function stopDropWatchSession(session: DropWatchTimeSession, input: { nowMs?: number | null; reason?: string | null } = {}): DropWatchTimeSession {
  const reason = String(input.reason ?? "");
  const completion = classifyWatchCompletion({
    mediaKind: session.mediaKind,
    activeWatchMs: session.activeWatchMs,
    contentDurationMs: session.contentDurationMs,
    playbackEventsPresent: isMediaRuntimeKind(session.mediaKind) && session.activeWatchMs > 0,
    renderedVisible: session.activeWatchMs > 0,
    interacted: session.mediaKind === "image" && session.activeWatchMs > 0,
  });
  const status: DropWatchSessionStatus = reason === "completed" || completion.completed
    ? "completed"
    : reason === "hidden"
      ? "hidden"
      : session.contentDurationMs
        ? "abandoned"
        : "duration_unavailable";

  return {
    ...session,
    playbackEndedAt: session.playbackEndedAt ?? (normalizeMs(input.nowMs) || null),
    status,
  };
}

export function preventWatchTimeDoubleCount(input: {
  dedupeKey: string;
  seenDedupeKeys: Set<string> | readonly string[];
}) {
  const seen = input.seenDedupeKeys instanceof Set
    ? input.seenDedupeKeys
    : new Set(input.seenDedupeKeys);
  const allow = Boolean(input.dedupeKey) && !seen.has(input.dedupeKey);
  return {
    allow,
    reason: allow ? "new_watch_session" : "duplicate_watch_session",
  } as const;
}

export function resolveDropWatchTelemetryPolicy(input: {
  eventName: DropWatchTimeTelemetryEvent;
  lastProgressEventAtMs?: number | null;
  nowMs?: number | null;
}) {
  if (input.eventName !== "drop_watch_progress") {
    return { shouldEmit: true, reason: "lifecycle_event" } as const;
  }

  const last = normalizeMs(input.lastProgressEventAtMs);
  const now = normalizeMs(input.nowMs);
  if (last > 0 && now > 0 && now - last < DROP_WATCH_PROGRESS_THROTTLE_MS) {
    return { shouldEmit: false, reason: "progress_throttled" } as const;
  }

  return { shouldEmit: true, reason: "progress_window_elapsed" } as const;
}
