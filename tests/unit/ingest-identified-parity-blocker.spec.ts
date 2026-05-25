import { describe, expect, it } from "vitest";

import { classifyIngestIdentifiedParityBlocker } from "@/lib/analytics/ingest-identified-parity-blocker";

describe("ingest identified parity blocker", () => {
  it("keeps current Analytics.IngestIdentified UnknownError as a parity blocker", () => {
    const blocker = classifyIngestIdentifiedParityBlocker({
      batch18Status: "fixed_current",
      clusters: [
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
          current: true,
        },
      ],
    });

    expect(blocker.classification).toBe("active_route_failing");
    expect(blocker.parityBlocked).toBe(true);
    expect(blocker.routeOwner).toBe("analytics ingest identified");
    expect(blocker.nextAction).toContain("Analytics.IngestIdentified");
    expect(blocker.doubleCountRisk).toBe("aliasing_must_remain_deduped");
  });
});
