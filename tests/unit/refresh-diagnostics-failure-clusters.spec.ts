import { describe, expect, it } from "vitest";

import { buildRefreshDiagnosticsFailureClusters } from "@/lib/analytics/refresh-diagnostics-failure-clusters";

describe("refresh diagnostics failure clusters", () => {
  it("makes route unknown and Analytics.IngestIdentified clusters actionable blockers", () => {
    const clusters = buildRefreshDiagnosticsFailureClusters({
      generatedAtUtc: "2026-05-24T15:58:00.000Z",
      clusters: [
        {
          source: "server_diagnostics",
          reasonCode: "error",
          count: 107,
          firstSeenAtUtc: "2026-05-24T15:46:35.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
        },
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
        },
      ],
    });

    expect(clusters[0]).toMatchObject({
      routeAttribution: "unknown",
      likelyOwner: "analytics diagnostics attribution",
      current: true,
      blocksTelemetryParity: true,
    });
    expect(clusters[0].nextAction).toContain("route attribution");
    expect(clusters[0].firstSeenAtUtc).toBeTruthy();
    expect(clusters[0].lastSeenAtUtc).toBeTruthy();

    const ingest = clusters.find((cluster) => cluster.errorName === "UnknownError");
    expect(ingest).toMatchObject({
      route: "analytics/ingest-identified",
      routeAttribution: "inferred",
      likelyOwner: "analytics ingest identified",
      current: true,
      blocksTelemetryParity: true,
    });
  });
});
