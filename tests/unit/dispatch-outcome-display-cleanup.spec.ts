import { describe, expect, it } from "vitest";

import { buildDispatchOutcomeDisplayModel } from "@/lib/debug/dispatch-outcome-display-cleanup";

describe("dispatch outcome display cleanup", () => {
  it("uses scheduler key timestamps and fallback drop labels for metadata gaps", () => {
    const display = buildDispatchOutcomeDisplayModel({
      schedulerKey: "drop-activation:Jgu68C61I1qfOrHmUKP8:1779620400000",
      outcome: "sent",
      errorCode: null,
      metadata: {
        dropId: "Jgu68C61I1qfOrHmUKP8",
        dropTitle: "Drop Jgu68C",
        source: "missing",
        confidence: "missing",
        missingReason: "bounded_lookup_no_document",
        nextAction: "Keep metadata gap visible.",
        dispatchOutcomeAffected: false,
      },
    });

    expect(display.label).toBe("Drop Jgu68C");
    expect(display.scheduledAtUtc).toBe("2026-05-24T11:00:00.000Z");
    expect(display.metadataBadge).toBe("missing lookup");
    expect(display.outcomeBadge).toBe("sent");
    expect(display.outcomeTruthState).toBe("live");
    expect(display.rawDetailsDefaultOpen).toBe(false);
    expect(display.defaultDropIdLabel).toBe("Jgu68C");
  });
});
