export const DROP_WATCH_TIME_CONTRACT_VERSION = "2026.05.drop-watch-time.1";

export const DROP_WATCH_MEDIA_KINDS = ["image", "video", "audio", "mixed", "unknown"] as const;
export type DropWatchMediaKind = (typeof DROP_WATCH_MEDIA_KINDS)[number];

export const DROP_WATCH_CONFIDENCE_LEVELS = [
  "exact_media_runtime",
  "active_visibility_estimated",
  "weak_visibility_only",
  "unavailable",
] as const;
export type DropWatchConfidence = (typeof DROP_WATCH_CONFIDENCE_LEVELS)[number];

export const DROP_WATCH_TIME_TELEMETRY_EVENTS = [
  "drop_watch_started",
  "drop_watch_progress",
  "drop_watch_completed",
  "drop_watch_abandoned",
  "drop_watch_hidden",
  "drop_watch_replayed",
  "drop_watch_duration_unavailable",
] as const;
export type DropWatchTimeTelemetryEvent = (typeof DROP_WATCH_TIME_TELEMETRY_EVENTS)[number];

export type DropWatchSessionStatus =
  | "started"
  | "in_progress"
  | "completed"
  | "abandoned"
  | "hidden"
  | "duration_unavailable";

export interface DropWatchTimeSession {
  dropId: string;
  mediaId: string;
  mediaKind: DropWatchMediaKind;
  contentDurationMs: number | null;
  visibleStartedAt: number | null;
  activeStartedAt: number | null;
  playbackStartedAt: number | null;
  playbackEndedAt: number | null;
  activeWatchMs: number;
  passiveVisibleMs: number;
  backgroundMs: number;
  replayCount: number;
  completionPercent: number | null;
  normalizedWatchPercent: number | null;
  watchConfidence: DropWatchConfidence;
  durationBiasPolicy: string;
  dedupeKey: string;
  status: DropWatchSessionStatus;
}

export interface DropWatchTimeDebugLane {
  label: "Drop watch time";
  status: "live" | "degraded";
  exactMediaRuntimeCount: number;
  activeVisibilityEstimatedCount: number;
  durationMissingCount: number;
  backgroundExcludedCount: number;
  suspiciousPageTimeFallbackCount: number;
  telemetryEvents: readonly DropWatchTimeTelemetryEvent[];
  sourceOfTruth: "src/lib/analytics/drop-watch-time-engine.ts";
}

export function isDropWatchMediaKind(value: unknown): value is DropWatchMediaKind {
  return typeof value === "string" && DROP_WATCH_MEDIA_KINDS.includes(value as DropWatchMediaKind);
}

export function normalizeDropWatchMediaKind(value: unknown): DropWatchMediaKind {
  if (isDropWatchMediaKind(value)) return value;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "pdf") return "image";
  if (normalized === "video") return "video";
  if (normalized === "audio") return "audio";
  if (normalized === "image") return "image";
  return "unknown";
}

export function buildDropWatchTimeDebugLane(input: Partial<Omit<DropWatchTimeDebugLane, "label" | "status" | "telemetryEvents" | "sourceOfTruth">> = {}): DropWatchTimeDebugLane {
  const durationMissingCount = Math.max(0, Math.trunc(Number(input.durationMissingCount ?? 0)));
  const suspiciousPageTimeFallbackCount = Math.max(0, Math.trunc(Number(input.suspiciousPageTimeFallbackCount ?? 0)));
  return {
    label: "Drop watch time",
    status: durationMissingCount > 0 || suspiciousPageTimeFallbackCount > 0 ? "degraded" : "live",
    exactMediaRuntimeCount: Math.max(0, Math.trunc(Number(input.exactMediaRuntimeCount ?? 0))),
    activeVisibilityEstimatedCount: Math.max(0, Math.trunc(Number(input.activeVisibilityEstimatedCount ?? 0))),
    durationMissingCount,
    backgroundExcludedCount: Math.max(0, Math.trunc(Number(input.backgroundExcludedCount ?? 0))),
    suspiciousPageTimeFallbackCount,
    telemetryEvents: DROP_WATCH_TIME_TELEMETRY_EVENTS,
    sourceOfTruth: "src/lib/analytics/drop-watch-time-engine.ts",
  };
}
