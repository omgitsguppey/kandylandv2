import { describe, expect, it } from "vitest";

import { buildSignalTelemetryDisconnectReport } from "../../scripts/agent/rank-signal-telemetry-disconnects";

describe("SIGNAL telemetry disconnect ranker", () => {
  it("prioritizes user/person duplicate intent without claiming runtime proof", () => {
    const report = buildSignalTelemetryDisconnectReport({
      packageScripts: {
        "signal:telemetry-rank": "tsx scripts/agent/rank-signal-telemetry-disconnects.ts",
      },
      telemetryGraph: {
        schemaVersion: "signal.telemetry-graph.v1",
        generatedAtUtc: "2026-06-07T00:00:00.000Z",
        reportPath: "agent/state/signal-telemetry-graph.generated.json",
        summary: { findingCount: 3 },
        findings: [
          {
            id: "finding:multi-event-metric:drop_opens",
            classification: "duplicate_intent",
            risk: "high",
            title: "Person metric consumes multiple event names: drop_opens",
            affectedFiles: ["src/lib/analytics/person-metrics-contract.ts"],
            evidenceKind: "source",
            recommendedNextAction: "Verify materializers dedupe aliases and preserve missing-vs-zero state.",
            minimalVerification: ["npm run check:event-translation-bridge"],
          },
          {
            id: "finding:stale-report:agent/state/example.generated.json",
            classification: "stale_generated_evidence",
            risk: "low",
            title: "Generated telemetry/analytics evidence predates touched source inventory.",
            affectedFiles: ["agent/state/example.generated.json"],
            evidenceKind: "generated_snapshot",
            recommendedNextAction: "Refresh only if consumed.",
            minimalVerification: ["npm run check:agent-context"],
          },
          {
            id: "finding:noncanonical-call:src/lib/example.ts",
            classification: "source_only_proof_risk",
            risk: "medium",
            title: "Source file appears to call a raw telemetry provider directly.",
            affectedFiles: ["src/lib/example.ts"],
            evidenceKind: "source",
            recommendedNextAction: "Confirm whether this bypasses the canonical telemetry envelope.",
            minimalVerification: ["npm run check:telemetry"],
          },
        ],
      },
    });

    expect(report.schemaVersion).toBe("signal.telemetry-disconnect-rank.v1");
    expect(report.reportPath).toBe("agent/state/signal-telemetry-disconnects.generated.json");
    expect(report.rankedFindings[0]?.eventOrMetricName).toBe("drop_opens");
    expect(report.rankedFindings[0]?.currentState).toBe("duplicate_intent");
    expect(report.rankedFindings[0]?.affectedActorScope).toContain("linked_person");
    expect(report.rankedFindings[0]?.canonicalOwner).toContain("person-metrics-contract.ts");
    expect(report.rankedFindings[0]?.terminalProofRequirement).toBe("targeted");
    expect(report.summary.forbiddenTerminalCount).toBe(1);
    expect(JSON.stringify(report)).not.toContain("provider_runtime_proof");
    expect(JSON.stringify(report)).not.toContain("proven_zero");
  });
});
