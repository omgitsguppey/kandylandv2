export type DailyTaskRefreshMetadataIssue =
  | "missing_next_refresh"
  | "last_reset_in_future"
  | "next_refresh_not_after_last_reset";

export function readTaskTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      toMillis?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
      _seconds?: unknown;
      _nanoseconds?: unknown;
    };

    if (typeof candidate.toMillis === "function") {
      try {
        const timestamp = Number(candidate.toMillis());
        return Number.isFinite(timestamp) ? timestamp : 0;
      } catch {
        return 0;
      }
    }

    const seconds = typeof candidate.seconds === "number" ? candidate.seconds : candidate._seconds;
    const nanoseconds = typeof candidate.nanoseconds === "number" ? candidate.nanoseconds : candidate._nanoseconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return Math.round(seconds * 1000 + (typeof nanoseconds === "number" && Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000 : 0));
    }
  }

  return 0;
}

export function getDailyTaskRefreshMetadataIssue(
  state: Record<string, unknown> | undefined,
  nowMs: number,
): DailyTaskRefreshMetadataIssue | null {
  const nextRefreshMs = readTaskTimestampMs(state?.nextRefreshMs);
  const lastResetMs = readTaskTimestampMs(state?.lastResetMs);

  if (nextRefreshMs <= 0) {
    return "missing_next_refresh";
  }

  if (lastResetMs > nowMs) {
    return "last_reset_in_future";
  }

  if (lastResetMs > 0 && nextRefreshMs <= lastResetMs) {
    return "next_refresh_not_after_last_reset";
  }

  return null;
}

export function hasInvalidDailyTaskRefreshMetadata(
  state: Record<string, unknown> | undefined,
  nowMs: number,
) {
  return getDailyTaskRefreshMetadataIssue(state, nowMs) !== null;
}
