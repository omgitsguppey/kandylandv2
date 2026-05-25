import { describe, expect, it } from "vitest";

import { enrichQueueDropMetadata } from "@/lib/debug/queue-drop-metadata-enrichment";

describe("queue drop metadata enrichment", () => {
  it("uses exact bounded lookup metadata when a drop record is available", () => {
    const result = enrichQueueDropMetadata({
      dropId: "Jgu68C61I1qfOrHmUKP8",
      boundedDropRecord: {
        title: "Bloomytrip's Peach & Natural",
        creatorId: "creator-1",
        status: "active",
      },
      creatorName: "@creator",
    });

    expect(result).toMatchObject({
      dropTitle: "Bloomytrip's Peach & Natural",
      source: "bounded_drop_lookup",
      confidence: "exact",
      creatorName: "@creator",
      dropStatus: "active",
    });
  });

  it("does not show generic Unknown drop for a valid unresolved drop id", () => {
    const result = enrichQueueDropMetadata({
      dropId: "Jgu68C61I1qfOrHmUKP8",
      boundedDropRecord: null,
    });

    expect(result.dropTitle).toBe("Drop Jgu68C");
    expect(result.source).toBe("missing");
    expect(result.confidence).toBe("missing");
    expect(result.missingReason).toBe("bounded_lookup_no_document");
    expect(result.dispatchOutcomeAffected).toBe(false);
  });

  it("labels deleted or archived drops as tombstones instead of faking a title", () => {
    const result = enrichQueueDropMetadata({
      dropId: "Jgu68C61I1qfOrHmUKP8",
      boundedDropRecord: { status: "archived", deletedAt: 1779620400000 },
    });

    expect(result.dropTitle).toBe("Deleted/archived drop Jgu68C");
    expect(result.source).toBe("tombstone");
    expect(result.confidence).toBe("legacy_missing");
  });
});
