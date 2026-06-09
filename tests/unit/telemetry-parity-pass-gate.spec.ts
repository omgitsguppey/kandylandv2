import { describe, expect, it } from "vitest";

import { buildTelemetryParityPassGate } from "@/lib/analytics/telemetry-parity-pass-gate";

describe("telemetry parity pass gate", () => {
  it("blocks low-confidence event samples when refresh diagnostics are failing", () => {
    const gate = buildTelemetryParityPassGate({
      eventSampleCount: 500,
      canonicalSampleCount: 500,
      confidence: 2,
      eventSource: "analytics_rollups_daily.authenticatedEvents",
      sampleSource: "analytics_event_facts",
      refreshDiagnosticsStatus: "fail",
      refreshFailureCount: 153,
      blockedReason: "analytics_refresh_failures_present",
      range: "30d",
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
      failureClusters: [
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
        },
        {
          source: "server_diagnostics",
          reasonCode: "error",
          count: 107,
          firstSeenAtUtc: "2026-05-24T15:46:35.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          suggestedAction: "Repair route attribution.",
        },
      ],
    });

    expect(gate.status).toBe("fail");
    expect(gate.passAllowed).toBe(false);
    expect(gate.sourceParityPassAllowed).toBe(false);
    expect(gate.finalPassAllowed).toBe(false);
    expect(gate.proofClasses.find((proof) => proof.proofClass === "source_parity")?.status).toBe("missing");
    expect(gate.confidenceStatus).toBe("low");
    expect(gate.blockers).toEqual(expect.arrayContaining([
      "low_confidence",
      "refresh_failures_present",
      "route_unknown_diagnostics",
      "ingest_identified_failures",
    ]));
    expect(gate.nextAction).toContain("Fix analytics refresh failures");
    expect(gate.nextAction).not.toMatch(/which event source is missing/iu);
    expect(gate.displaySummary).toContain("Sample presence confirmed");
  });

  it("allows source parity to pass without clearing formal proof gates", () => {
    const gate = buildTelemetryParityPassGate({
      eventSampleCount: 500,
      canonicalSampleCount: 500,
      confidence: 100,
      eventSource: "analytics_event_facts.eventName",
      sampleSource: "telemetry_catalog",
      refreshDiagnosticsStatus: "pass",
      refreshFailureCount: 0,
      range: "30d",
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
      requiredProofClasses: [
        "source_parity",
        "runtime_route_health",
        "provider_smoke",
        "admin_truth_sample",
      ],
      proofClasses: {
        admin_truth_sample: "present",
      },
    });

    expect(gate.sourceParityStatus).toBe("pass");
    expect(gate.sourceParityPassAllowed).toBe(true);
    expect(gate.finalEvidenceStatus).toBe("review");
    expect(gate.passAllowed).toBe(false);
    expect(gate.finalPassAllowed).toBe(false);
    expect(gate.missingProofClasses).toEqual(expect.arrayContaining([
      "runtime_route_health",
      "provider_smoke",
    ]));
    expect(gate.blockers).toEqual(expect.arrayContaining([
      "runtime_route_health_missing",
      "provider_smoke_missing",
    ]));
    expect(gate.displaySummary).toContain("Source telemetry parity passes");
  });

  it("passes final parity only when every required proof class is present", () => {
    const gate = buildTelemetryParityPassGate({
      eventSampleCount: 500,
      canonicalSampleCount: 500,
      confidence: 100,
      eventSource: "analytics_event_facts.eventName",
      sampleSource: "telemetry_catalog",
      refreshDiagnosticsStatus: "pass",
      refreshFailureCount: 0,
      range: "30d",
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
      requiredProofClasses: [
        "source_parity",
        "runtime_route_health",
        "provider_smoke",
        "admin_truth_sample",
      ],
      proofClasses: {
        runtime_route_health: "present",
        provider_smoke: "present",
        admin_truth_sample: "present",
      },
    });

    expect(gate.status).toBe("pass");
    expect(gate.sourceParityStatus).toBe("pass");
    expect(gate.finalEvidenceStatus).toBe("pass");
    expect(gate.passAllowed).toBe(true);
    expect(gate.missingProofClasses).toEqual([]);
    expect(gate.blockers).toEqual(["none"]);
  });
});
