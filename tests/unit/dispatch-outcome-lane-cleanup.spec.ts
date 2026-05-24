import { describe, expect, it } from "vitest";

import { classifyDispatchOutcomeLane } from "@/lib/debug/dispatch-outcome-lane-status";

const NOW_MS = Date.parse("2026-05-24T18:00:00.000Z");

describe("dispatch outcome lane cleanup", () => {
  it("classifies non-empty outcomes instead of leaving the lane unknown", () => {
    const lane = classifyDispatchOutcomeLane({
      nowMs: NOW_MS,
      outcomes: Array.from({ length: 40 }, (_, index) => ({
        stable_id: `outcome-${index}`,
        status: "sent",
        updatedAt: NOW_MS - 90_000,
      })),
      sourceLoaded: true,
      savedDataCount: 0,
    });

    expect(lane.status).toBe("observed_current");
    expect(lane.outcomeCount).toBe(40);
    expect(lane.failedCount).toBe(0);
    expect(lane.savedDataStatus).toBe("no_saved_payload_expected");
    expect(lane.readableWhenHeartbeatMissing).toBe(true);
    expect(lane.healthProven).toBe(true);
  });

  it("keeps failed=0 from proving health when the outcome source is missing", () => {
    const lane = classifyDispatchOutcomeLane({
      nowMs: NOW_MS,
      outcomes: [],
      sourceLoaded: false,
      savedDataCount: 0,
    });

    expect(lane.status).toBe("source_missing");
    expect(lane.healthProven).toBe(false);
    expect(lane.nextAction).toContain("Load dispatch outcome source");
  });
});
