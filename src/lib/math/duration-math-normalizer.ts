import type { MathFormulaId } from "@/lib/math/canonical-math-authority-contract";

export const DURATION_MATH_CONTRACT_VERSION = "duration-math-normalization.v1";

export const DURATION_MATH_CATEGORIES = [
  "session_active",
  "session_passive",
  "session_idle",
  "session_hidden",
  "drop_watch_active",
  "drop_watch_normalized",
  "task_active_duration",
  "checkout_flow_duration",
  "auth_flow_duration",
  "chat_typing_duration",
  "media_upload_duration",
  "notification_permission_duration",
  "unknown_legacy_duration",
] as const;

export type DurationMathCategory = (typeof DURATION_MATH_CATEGORIES)[number];
export type DurationMathSource =
  | "session"
  | "media"
  | "task"
  | "checkout"
  | "auth"
  | "chat"
  | "upload"
  | "notification"
  | "flow"
  | "page"
  | "legacy"
  | "unknown";
export type DurationMathConfidence = "exact" | "estimated" | "unavailable" | "legacy_unknown";

export type DurationMathInput = {
  category: DurationMathCategory;
  source?: DurationMathSource | null;
  startedAtMs?: number | null;
  endedAtMs?: number | null;
  completedAtMs?: number | null;
  failedAtMs?: number | null;
  abandonedAtMs?: number | null;
  timeoutAtMs?: number | null;
  durationMs?: number | null;
  foregroundVisibleMs?: number | null;
  activeMs?: number | null;
  passiveVisibleMs?: number | null;
  idleMs?: number | null;
  hiddenMs?: number | null;
  playingMs?: number | null;
  mediaActiveMs?: number | null;
  contentDurationMs?: number | null;
  replayCount?: number | null;
  countReplay?: boolean | null;
  recentActivityAtMs?: number | null;
  pageOpenMs?: number | null;
  legacy?: boolean | null;
};

export type NormalizedDurationDecision = {
  contractVersion: typeof DURATION_MATH_CONTRACT_VERSION;
  input: DurationMathInput;
  category: DurationMathCategory;
  formulaId: MathFormulaId;
  durationMs: number | null;
  activeMs: number | null;
  passiveVisibleMs: number | null;
  idleMs: number | null;
  hiddenMs: number | null;
  watchMs: number | null;
  flowMs: number | null;
  normalizedWatchPercent: number | null;
  confidence: DurationMathConfidence;
  availability: "available" | "unavailable";
  suspiciousPageTimeFallback: boolean;
  backgroundExcluded: boolean;
  reasons: string[];
};

const DURATION_FORMULA_IDS: Record<DurationMathCategory, MathFormulaId> = Object.fromEntries(
  DURATION_MATH_CATEGORIES.map((category) => [category, `duration_math.${category}`]),
) as Record<DurationMathCategory, MathFormulaId>;

function ms(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.trunc(numeric));
}

function positiveTimestamp(value: unknown): number | null {
  const normalized = ms(value);
  return normalized && normalized > 0 ? normalized : null;
}

function boundedPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function hasExactLifecycle(input: DurationMathInput): boolean {
  return Boolean(positiveTimestamp(input.startedAtMs) && (
    positiveTimestamp(input.endedAtMs)
    || positiveTimestamp(input.completedAtMs)
    || positiveTimestamp(input.failedAtMs)
  ));
}

function finishAt(input: DurationMathInput): number | null {
  return positiveTimestamp(input.endedAtMs)
    ?? positiveTimestamp(input.completedAtMs)
    ?? positiveTimestamp(input.failedAtMs)
    ?? positiveTimestamp(input.abandonedAtMs)
    ?? positiveTimestamp(input.timeoutAtMs);
}

function spanMs(input: DurationMathInput): number | null {
  const start = positiveTimestamp(input.startedAtMs);
  const end = finishAt(input);
  if (!start || !end || end < start) return null;
  return Math.max(0, end - start);
}

function isLegacyUnknown(input: DurationMathInput): boolean {
  return input.legacy === true || input.category === "unknown_legacy_duration";
}

function isPageWatchFallback(input: DurationMathInput): boolean {
  return (input.category === "drop_watch_active" || input.category === "drop_watch_normalized")
    && (input.source === "page" || (ms(input.pageOpenMs) ?? 0) > 0)
    && (ms(input.mediaActiveMs) ?? 0) === 0
    && (ms(input.playingMs) ?? 0) === 0;
}

export function calculateHiddenMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input)) return null;
  return ms(input.hiddenMs) ?? 0;
}

export function calculateIdleMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input)) return null;
  return ms(input.idleMs) ?? 0;
}

export function calculatePassiveVisibleMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input)) return null;
  const explicitPassive = ms(input.passiveVisibleMs);
  if (explicitPassive !== null) return explicitPassive;
  const foreground = ms(input.foregroundVisibleMs);
  if (foreground === null) return null;
  const active = ms(input.activeMs) ?? 0;
  const idle = ms(input.idleMs) ?? 0;
  const hidden = ms(input.hiddenMs) ?? 0;
  return Math.max(0, foreground - active - idle - hidden);
}

export function calculateActiveDurationMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input)) return null;
  const explicitActive = ms(input.activeMs);
  if (explicitActive !== null) {
    const foreground = ms(input.foregroundVisibleMs);
    const idle = ms(input.idleMs) ?? 0;
    const hidden = ms(input.hiddenMs) ?? 0;
    const visibleCap = foreground !== null ? Math.max(0, foreground - idle - hidden) : explicitActive;
    return Math.max(0, Math.min(explicitActive, visibleCap));
  }
  const span = spanMs(input);
  if (span === null || !positiveTimestamp(input.recentActivityAtMs)) return null;
  const passive = ms(input.passiveVisibleMs) ?? 0;
  const idle = ms(input.idleMs) ?? 0;
  const hidden = ms(input.hiddenMs) ?? 0;
  return Math.max(0, span - passive - idle - hidden);
}

export function calculateWatchDurationMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input) || isPageWatchFallback(input)) return null;
  if (input.category !== "drop_watch_active" && input.category !== "drop_watch_normalized") return null;
  if (input.source !== "media" && input.source !== undefined && input.source !== null) return null;

  const mediaActive = ms(input.mediaActiveMs) ?? ms(input.playingMs) ?? ms(input.activeMs);
  if (mediaActive === null || mediaActive <= 0) return null;

  const contentDuration = ms(input.contentDurationMs);
  if (contentDuration === null || contentDuration <= 0) return mediaActive;

  const replayMultiplier = input.countReplay
    ? Math.max(1, Math.trunc(ms(input.replayCount) ?? 1))
    : 1;
  return Math.min(mediaActive, contentDuration * replayMultiplier);
}

export function calculateFlowDurationMs(input: DurationMathInput): number | null {
  if (isLegacyUnknown(input)) return null;
  if (input.category === "drop_watch_active" || input.category === "drop_watch_normalized") return null;
  return spanMs(input) ?? ms(input.durationMs);
}

export function classifyDurationConfidence(input: DurationMathInput): DurationMathConfidence {
  if (isLegacyUnknown(input) && !hasExactLifecycle(input)) return "legacy_unknown";
  if (isPageWatchFallback(input)) return "unavailable";
  if (positiveTimestamp(input.abandonedAtMs) || positiveTimestamp(input.timeoutAtMs)) return "estimated";
  if (hasExactLifecycle(input)) return "exact";
  if ((input.category === "drop_watch_active" || input.category === "drop_watch_normalized")
    && calculateWatchDurationMs(input) !== null) {
    return input.contentDurationMs ? "exact" : "estimated";
  }
  if (ms(input.durationMs) !== null && !isLegacyUnknown(input)) return "estimated";
  return "unavailable";
}

export function normalizeDurationInput(input: DurationMathInput): NormalizedDurationDecision {
  const suspiciousPageTimeFallback = isPageWatchFallback(input);
  const activeMs = calculateActiveDurationMs(input);
  const passiveVisibleMs = calculatePassiveVisibleMs(input);
  const idleMs = calculateIdleMs(input);
  const hiddenMs = calculateHiddenMs(input);
  const watchMs = calculateWatchDurationMs(input);
  const flowMs = calculateFlowDurationMs(input);
  const confidence = classifyDurationConfidence(input);
  const contentDuration = ms(input.contentDurationMs);
  const replayMultiplier = input.countReplay ? Math.max(1, Math.trunc(ms(input.replayCount) ?? 1)) : 1;
  const normalizedWatchPercent = watchMs !== null && contentDuration && contentDuration > 0
    ? boundedPercent((watchMs / (contentDuration * replayMultiplier)) * 100)
    : null;
  const durationMs = input.category.startsWith("drop_watch")
    ? watchMs
    : input.category === "session_active"
      ? activeMs
      : input.category === "session_passive"
        ? passiveVisibleMs
        : input.category === "session_idle"
          ? idleMs
          : input.category === "session_hidden"
            ? hiddenMs
            : flowMs;
  const reasons = [
    ...(isLegacyUnknown(input) ? ["legacy duration without exact start/end remains unavailable"] : []),
    ...(suspiciousPageTimeFallback ? ["page-open time is not watch time"] : []),
    ...((hiddenMs ?? 0) > 0 ? ["hidden/background duration excluded from active time"] : []),
    ...((idleMs ?? 0) > 0 ? ["idle duration excluded from active time"] : []),
    ...(confidence === "estimated" ? ["duration is estimated from abandonment, timeout, or partial lifecycle evidence"] : []),
    ...(durationMs === null ? ["unknown duration is unavailable, not zero"] : []),
  ];

  return {
    contractVersion: DURATION_MATH_CONTRACT_VERSION,
    input,
    category: input.category,
    formulaId: DURATION_FORMULA_IDS[input.category],
    durationMs,
    activeMs,
    passiveVisibleMs,
    idleMs,
    hiddenMs,
    watchMs,
    flowMs,
    normalizedWatchPercent,
    confidence,
    availability: durationMs === null || confidence === "unavailable" || confidence === "legacy_unknown" ? "unavailable" : "available",
    suspiciousPageTimeFallback,
    backgroundExcluded: (hiddenMs ?? 0) > 0,
    reasons,
  };
}

export function explainDurationDecision(input: DurationMathInput): string {
  const decision = normalizeDurationInput(input);
  return [
    `category=${decision.category}`,
    `formulaId=${decision.formulaId}`,
    `durationMs=${decision.durationMs ?? "unavailable"}`,
    `activeMs=${decision.activeMs ?? "unavailable"}`,
    `passiveVisibleMs=${decision.passiveVisibleMs ?? "unavailable"}`,
    `idleMs=${decision.idleMs ?? "unavailable"}`,
    `hiddenMs=${decision.hiddenMs ?? "unavailable"}`,
    `watchMs=${decision.watchMs ?? "unavailable"}`,
    `confidence=${decision.confidence}`,
    `availability=${decision.availability}`,
    ...decision.reasons,
  ].join("; ");
}
