import { describe, expect, it } from "vitest";

import {
  buildDropActivationSchedulerDebug,
  formatSchedulerKeyTimestampUtc,
  isDropActivationSchedulerKey,
  parseDropActivationSchedulerKey,
} from "@/lib/debug/drop-activation-scheduler-key";

describe("drop activation scheduler key", () => {
  it("parses drop id and scheduled UTC from canonical scheduler keys", () => {
    const parsed = parseDropActivationSchedulerKey("drop-activation:Jgu68C61I1qfOrHmUKP8:1779620400000");

    expect(parsed).toMatchObject({
      ok: true,
      kind: "drop_activation",
      dropId: "Jgu68C61I1qfOrHmUKP8",
      scheduledAtMs: 1779620400000,
      scheduledAtUtc: "2026-05-24T11:00:00.000Z",
      parseError: null,
    });
    expect(isDropActivationSchedulerKey("drop-activation:Jgu68C61I1qfOrHmUKP8:1779620400000")).toBe(true);
    expect(formatSchedulerKeyTimestampUtc("drop-activation:Jgu68C61I1qfOrHmUKP8:1779620400000")).toBe("2026-05-24T11:00:00.000Z");
  });

  it("preserves invalid scheduler keys with a parse error", () => {
    const parsed = parseDropActivationSchedulerKey("drop-activation:Jgu68C61I1qfOrHmUKP8:not-a-time");

    expect(parsed.ok).toBe(false);
    expect(parsed.dropId).toBe("Jgu68C61I1qfOrHmUKP8");
    expect(parsed.scheduledAtMs).toBeNull();
    expect(parsed.parseError).toContain("invalid_scheduled_at");
    expect(buildDropActivationSchedulerDebug({ schedulerKey: "bad-key" }).mutationAllowed).toBe(false);
  });
});
