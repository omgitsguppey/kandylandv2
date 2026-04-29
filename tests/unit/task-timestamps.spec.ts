import { describe, expect, it } from "vitest";

import {
  getDailyTaskRefreshMetadataIssue,
  readTaskTimestampMs,
} from "@/lib/tasks/task-timestamps";

describe("daily task timestamp normalization", () => {
  it("reads numeric, string, Date, and Firestore timestamp shapes as milliseconds", () => {
    expect(readTaskTimestampMs(1_777_000_000_000)).toBe(1_777_000_000_000);
    expect(readTaskTimestampMs("1777000000000")).toBe(1_777_000_000_000);
    expect(readTaskTimestampMs(new Date(1_777_000_000_000))).toBe(1_777_000_000_000);
    expect(readTaskTimestampMs({ toMillis: () => 1_777_000_000_000 })).toBe(1_777_000_000_000);
    expect(readTaskTimestampMs({ seconds: 1_777_000_000, nanoseconds: 500_000_000 })).toBe(1_777_000_000_500);
    expect(readTaskTimestampMs({ _seconds: 1_777_000_000, _nanoseconds: 250_000_000 })).toBe(1_777_000_000_250);
  });

  it("does not flag Firestore timestamp refresh metadata as invalid", () => {
    const lastResetMs = 1_777_000_000_000;
    const nextRefreshMs = lastResetMs + 60_000;

    expect(getDailyTaskRefreshMetadataIssue({
      lastResetMs: { toMillis: () => lastResetMs },
      nextRefreshMs: { seconds: Math.floor(nextRefreshMs / 1000), nanoseconds: (nextRefreshMs % 1000) * 1_000_000 },
    }, nextRefreshMs - 1)).toBeNull();
  });

  it("returns exact refresh metadata issue codes for real invalid states", () => {
    expect(getDailyTaskRefreshMetadataIssue({ lastResetMs: 1000 }, 2000)).toBe("missing_next_refresh");
    expect(getDailyTaskRefreshMetadataIssue({ lastResetMs: 3000, nextRefreshMs: 4000 }, 2000)).toBe("last_reset_in_future");
    expect(getDailyTaskRefreshMetadataIssue({ lastResetMs: 3000, nextRefreshMs: 3000 }, 4000)).toBe("next_refresh_not_after_last_reset");
  });
});
