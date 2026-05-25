import { describe, expect, it } from "vitest";

import { classifyWatchSessionFactLinks } from "@/lib/analytics/watch-session-fact-linker";

describe("watch session fact linker", () => {
  it("classifies missing links without promoting replay recovery to exact capture", () => {
    const result = classifyWatchSessionFactLinks({
      watchSessionIds: ["watch-1", "watch-2"],
      sessionFactWatchSessionIds: ["watch-1"],
      replayRecoveredSessionIds: ["watch-2"],
      duplicateWatchSessionIds: [],
    });

    expect(result.state).toBe("review");
    expect(result.missingLinkReason).toBe("watch_session_fact_link_missing");
    expect(result.exactCapturePromotedFromReplay).toBe(false);
  });
});
