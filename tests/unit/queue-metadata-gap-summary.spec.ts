import { describe, expect, it } from "vitest";

import { buildQueueMetadataGapSummary } from "@/lib/debug/queue-metadata-gap-summary";

describe("queue metadata gap summary", () => {
  it("keeps sent dispatch health separate from debug enrichment gaps", () => {
    const summary = buildQueueMetadataGapSummary([
      {
        outcome: "sent",
        schedulerKeyParsed: true,
        metadataConfidence: "exact",
        dropId: "resolved",
        payloadCorrectnessGap: false,
      },
      {
        outcome: "sent",
        schedulerKeyParsed: true,
        metadataConfidence: "missing",
        dropId: "Jgu68C61I1qfOrHmUKP8",
        payloadCorrectnessGap: false,
      },
    ]);

    expect(summary.totalDispatchOutcomes).toBe(2);
    expect(summary.sentOutcomes).toBe(2);
    expect(summary.failedOutcomes).toBe(0);
    expect(summary.metadataResolved).toBe(1);
    expect(summary.metadataMissing).toBe(1);
    expect(summary.schedulerKeysParsed).toBe(2);
    expect(summary.debugOnlyEnrichmentGapCount).toBe(1);
    expect(summary.payloadCorrectnessGapCount).toBe(0);
    expect(summary.dispatchHealthStatus).toBe("sent_outcomes_readable_with_enrichment_caveat");
    expect(summary.topMissingDropIds).toEqual(["Jgu68C61I1qfOrHmUKP8"]);
  });
});
