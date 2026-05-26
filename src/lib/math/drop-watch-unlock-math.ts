import type { DropWatchConfidence, DropWatchMediaKind } from "@/lib/analytics/drop-watch-time-contract";

export const DROP_WATCH_UNLOCK_MATH_VERSION = "2026.05.drop-watch-unlock-math.1";
export const STATIC_REVIEW_EXPECTED_MS = 10_000;
export const STATIC_CONTINUOUS_EXPOSURE_CAP_MS = 30_000;
export const STATIC_COMPLETION_MS = 5_000;
export const MEDIA_COMPLETION_THRESHOLD = 0.9;

export type DropAction =
  | "drop_opened"
  | "drop_unlocked"
  | "drop_unwrapped"
  | "watch_started"
  | "unknown";

export type WatchInterval = {
  startedAtMs: number;
  endedAtMs: number;
  documentVisible?: boolean | null;
  mediaPlaying?: boolean | null;
  userActive?: boolean | null;
  lockedPreview?: boolean | null;
  restartedAfterCompletion?: boolean | null;
};

export type DropWatchMathInput = {
  mediaKind: DropWatchMediaKind | "static" | string;
  unlocked?: boolean | null;
  renderedVisible?: boolean | null;
  lockedPreview?: boolean | null;
  playbackIntervals?: readonly WatchInterval[] | null;
  activeVisibleIntervals?: readonly WatchInterval[] | null;
  activeWatchMs?: number | null;
  activeVisibleMs?: number | null;
  contentDurationMs?: number | null;
  expectedStaticReviewMs?: number | null;
  interacted?: boolean | null;
  playbackEventsPresent?: boolean | null;
  pageDurationMs?: number | null;
  explicitUnwrapOrNextAction?: boolean | null;
};

export type StaticDropWatchResult = {
  activeWatchMs: number;
  normalizedWatchPercent: number | null;
  expectedStaticReviewMs: number;
  capped: boolean;
  confidence: DropWatchConfidence;
};

export type WatchCompletionResult = {
  completed: boolean;
  normalizedWatchPercent: number | null;
  replayCount: number;
  confidence: DropWatchConfidence;
  reason: "media_threshold" | "static_threshold" | "explicit_unwrap_or_next_action" | "not_complete" | "unavailable";
};

export type UnlockUnwrapSeparationInput = {
  unlockEventName?: string | null;
  unwrapEventName?: string | null;
  entitlementGranted?: boolean | null;
  payloadRevealSource?: string | null;
};

export type UnlockUnwrapSeparationResult = {
  valid: boolean;
  unlockEqualsUnwrap: boolean;
  reason: "separated" | "unlock_missing" | "unwrap_without_reveal" | "unlock_equals_unwrap";
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function positiveMs(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function boundedRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function intervalMs(interval: WatchInterval) {
  return Math.max(0, positiveMs(interval.endedAtMs) - positiveMs(interval.startedAtMs));
}

function isMediaKind(mediaKind: unknown) {
  const normalized = cleanString(mediaKind).toLowerCase();
  return normalized === "video" || normalized === "audio";
}

function isStaticKind(mediaKind: unknown) {
  const normalized = cleanString(mediaKind).toLowerCase();
  return normalized === "image" || normalized === "static" || normalized === "pdf";
}

export function classifyDropAction(input: {
  eventName?: string | null;
  entitlementGranted?: boolean | null;
  payloadRevealed?: boolean | null;
  unlocked?: boolean | null;
  renderedVisible?: boolean | null;
}) {
  const eventName = cleanString(input.eventName).toLowerCase();
  if (eventName === "drop_opened" || /drop_(preview_)?(opened|viewed)|view_drop_details|drop_clicked/u.test(eventName)) return "drop_opened" as const;
  if (eventName === "drop_unlocked" || eventName === "entitlement_granted" || eventName === "unlock_drop_success" || input.entitlementGranted === true) {
    return "drop_unlocked" as const;
  }
  if ((eventName === "drop_unwrapped" || eventName === "creator_drop_unwrapped") && input.payloadRevealed === true) return "drop_unwrapped" as const;
  if ((eventName === "watch_started" || eventName === "watch_session_started" || eventName === "drop_watch_started") && input.unlocked === true && input.renderedVisible === true) {
    return "watch_started" as const;
  }
  return "unknown" as const;
}

export function calculateActiveWatchMs(input: DropWatchMathInput) {
  if (input.lockedPreview === true || input.unlocked === false || input.renderedVisible === false) return 0;
  const explicitActiveMs = positiveMs(input.activeWatchMs);
  if (explicitActiveMs > 0 && !positiveMs(input.pageDurationMs)) return explicitActiveMs;

  const intervals = isMediaKind(input.mediaKind) ? input.playbackIntervals ?? [] : input.activeVisibleIntervals ?? [];
  return intervals.reduce((total, interval) => {
    if (interval.lockedPreview === true) return total;
    if (interval.documentVisible !== true) return total;
    if (isMediaKind(input.mediaKind) && interval.mediaPlaying !== true) return total;
    if (!isMediaKind(input.mediaKind) && interval.userActive !== true) return total;
    return total + intervalMs(interval);
  }, 0);
}

export function calculateNormalizedWatchPercent(input: {
  activeWatchMs?: number | null;
  contentDurationMs?: number | null;
  expectedStaticReviewMs?: number | null;
  mediaKind?: DropWatchMediaKind | "static" | string | null;
}) {
  const activeWatchMs = positiveMs(input.activeWatchMs);
  const denominator = isStaticKind(input.mediaKind)
    ? positiveMs(input.expectedStaticReviewMs) || STATIC_REVIEW_EXPECTED_MS
    : positiveMs(input.contentDurationMs);
  if (activeWatchMs <= 0 || denominator <= 0) return null;
  return boundedRatio(activeWatchMs / denominator);
}

export function calculateStaticDropWatch(input: DropWatchMathInput): StaticDropWatchResult {
  const expectedStaticReviewMs = positiveMs(input.expectedStaticReviewMs) || STATIC_REVIEW_EXPECTED_MS;
  const rawActiveMs = positiveMs(input.activeVisibleMs) || calculateActiveWatchMs({ ...input, mediaKind: input.mediaKind || "image" });
  const capped = input.interacted !== true && rawActiveMs > STATIC_CONTINUOUS_EXPOSURE_CAP_MS;
  const activeWatchMs = capped ? STATIC_CONTINUOUS_EXPOSURE_CAP_MS : rawActiveMs;
  return {
    activeWatchMs,
    normalizedWatchPercent: calculateNormalizedWatchPercent({
      activeWatchMs,
      expectedStaticReviewMs,
      mediaKind: "image",
    }),
    expectedStaticReviewMs,
    capped,
    confidence: classifyWatchConfidence({ ...input, activeWatchMs, mediaKind: "image" }),
  };
}

function replayCount(input: DropWatchMathInput, normalizedWatchPercent: number | null) {
  const restarted = (input.playbackIntervals ?? []).filter((interval) => interval.restartedAfterCompletion === true).length;
  if (restarted > 0) return restarted;
  const activeWatchMs = positiveMs(input.activeWatchMs) || calculateActiveWatchMs(input);
  const duration = positiveMs(input.contentDurationMs);
  if (duration > 0 && activeWatchMs >= duration * 1.9 && (normalizedWatchPercent ?? 0) >= MEDIA_COMPLETION_THRESHOLD) return Math.floor(activeWatchMs / duration) - 1;
  return 0;
}

export function classifyWatchCompletion(input: DropWatchMathInput): WatchCompletionResult {
  const activeWatchMs = positiveMs(input.activeWatchMs) || calculateActiveWatchMs(input);
  const normalizedWatchPercent = calculateNormalizedWatchPercent({
    activeWatchMs,
    contentDurationMs: input.contentDurationMs,
    expectedStaticReviewMs: input.expectedStaticReviewMs,
    mediaKind: input.mediaKind,
  });
  const watchConfidence = classifyWatchConfidence({
    ...input,
    activeWatchMs,
    playbackEventsPresent: isMediaKind(input.mediaKind) ? input.playbackEventsPresent !== false : input.playbackEventsPresent,
    renderedVisible: input.renderedVisible ?? activeWatchMs > 0,
    interacted: input.interacted ?? (isStaticKind(input.mediaKind) && activeWatchMs > 0),
  });
  if (watchConfidence === "unavailable") {
    return { completed: false, normalizedWatchPercent, replayCount: 0, confidence: watchConfidence, reason: "unavailable" };
  }
  if (isMediaKind(input.mediaKind)) {
    const completed = (normalizedWatchPercent ?? 0) >= MEDIA_COMPLETION_THRESHOLD;
    return {
      completed,
      normalizedWatchPercent,
      replayCount: replayCount({ ...input, activeWatchMs }, normalizedWatchPercent),
      confidence: watchConfidence,
      reason: completed ? "media_threshold" : "not_complete",
    };
  }
  if (isStaticKind(input.mediaKind)) {
    if (input.explicitUnwrapOrNextAction === true) {
      return { completed: true, normalizedWatchPercent, replayCount: 0, confidence: watchConfidence, reason: "explicit_unwrap_or_next_action" };
    }
    const completed = activeWatchMs >= STATIC_COMPLETION_MS;
    return { completed, normalizedWatchPercent, replayCount: 0, confidence: watchConfidence, reason: completed ? "static_threshold" : "not_complete" };
  }
  return { completed: false, normalizedWatchPercent, replayCount: 0, confidence: watchConfidence, reason: "unavailable" };
}

export function classifyWatchConfidence(input: DropWatchMathInput): DropWatchConfidence {
  const activeWatchMs = positiveMs(input.activeWatchMs) || calculateActiveWatchMs(input);
  if (activeWatchMs <= 0 || input.lockedPreview === true || input.unlocked === false) return "unavailable";
  if (isMediaKind(input.mediaKind) && input.playbackEventsPresent === true && positiveMs(input.contentDurationMs) > 0) return "exact_media_runtime";
  if (input.renderedVisible === true && input.interacted === true) return "active_visibility_estimated";
  if (isStaticKind(input.mediaKind) && positiveMs(input.contentDurationMs) > 0 && input.renderedVisible !== false) return "active_visibility_estimated";
  if (input.renderedVisible === true) return "weak_visibility_only";
  return "unavailable";
}

export function explainWatchCalculation(input: DropWatchMathInput) {
  const parts = [
    "Watch time uses active unlocked content exposure.",
    "PageDurationMs rejected as watch time.",
  ];
  if (input.lockedPreview === true || input.unlocked === false) parts.push("Locked preview cannot contribute watch time.");
  if (isMediaKind(input.mediaKind)) parts.push("Media watch uses visible playback intervals only.");
  if (isStaticKind(input.mediaKind)) parts.push("Static watch uses active visible dwell capped at 30s unless interaction continues.");
  return parts.join(" ");
}

export function validateUnlockUnwrapSeparation(input: UnlockUnwrapSeparationInput): UnlockUnwrapSeparationResult {
  const unlockEventName = cleanString(input.unlockEventName);
  const unwrapEventName = cleanString(input.unwrapEventName);
  if (!unlockEventName || input.entitlementGranted !== true) return { valid: false, unlockEqualsUnwrap: false, reason: "unlock_missing" };
  if (unlockEventName === unwrapEventName) return { valid: false, unlockEqualsUnwrap: true, reason: "unlock_equals_unwrap" };
  if (unwrapEventName && !cleanString(input.payloadRevealSource)) return { valid: false, unlockEqualsUnwrap: false, reason: "unwrap_without_reveal" };
  return { valid: true, unlockEqualsUnwrap: false, reason: "separated" };
}
