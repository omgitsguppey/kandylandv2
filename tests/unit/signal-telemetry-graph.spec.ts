import { describe, expect, it } from "vitest";

import { buildSignalTelemetryGraphReport } from "../../scripts/agent/collect-signal-telemetry-graph";
import { readFileModifiedMarker } from "../../scripts/agent/shared";

describe("SIGNAL telemetry graph collector", () => {
  it("builds a compact source-only telemetry graph without raw source or secrets", () => {
    const touchedPath = "src/lib/telemetry.ts";
    const staleReportPath = "agent/state/event-catalog-telemetry-audit.generated.json";
    const report = buildSignalTelemetryGraphReport({
      trackedFiles: [
        "src/lib/telemetry.ts",
        "src/lib/telemetry-catalog.ts",
        "src/lib/analytics/telemetry/surface-telemetry-catalog-events.ts",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/analytics/telemetry-intent-aliases.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/app/api/analytics/ingest-identified/route.ts",
        "src/app/admin/analytics/page.tsx",
        "src/components/AdminErrorCatcher.tsx",
        "tests/unit/analytics-ingest-identified-route.spec.ts",
        "tests/unit/telemetry-duplicate-intent-classification.spec.ts",
        staleReportPath,
      ],
      inventoryItems: [
        { path: touchedPath, last_modified_or_hash: readFileModifiedMarker(touchedPath) },
        { path: staleReportPath, generated: true, evidence_only: true, last_modified_or_hash: "1:stale" },
      ],
      packageScripts: {
        "signal:telemetry-graph": "tsx scripts/agent/collect-signal-telemetry-graph.ts",
      },
    });

    expect(report.schemaVersion).toBe("signal.telemetry-graph.v1");
    expect(report.reportPath).toBe("agent/state/signal-telemetry-graph.generated.json");
    expect(report.summary.catalogedEventCount).toBeGreaterThan(100);
    expect(report.summary.personMetricCount).toBeGreaterThan(5);
    expect(report.summary.ingestionRouteCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.generatedEvidenceReportCount).toBe(1);
    expect(report.summary.staleGeneratedEvidenceCount).toBe(1);
    expect(report.summary.dependencyPathCount).toBe(report.summary.catalogedEventCount);
    expect(report.summary.byGapClassification).toHaveProperty("runtime_unproven");
    expect(report.findings.some((finding) => finding.id.includes("uncataloged-admin_ui_error"))).toBe(false);
    expect(report.findings.some((finding) => finding.id.includes("diagnostics-only-admin_ui_error"))).toBe(true);
    expect(report.summary.runtimeUnprovenPathCount).toBeGreaterThanOrEqual(0);
    expect(report.nodes.catalogRows.examples.length).toBeLessThanOrEqual(25);
    expect(report.nodes.emitters.examples.length).toBeLessThanOrEqual(25);
    expect(report.nodes.dependencyPaths.examples[0]).toMatchObject({
      evidenceStatus: {
        sourceOnly: true,
        runtimeProven: false,
        externalProviderProven: false,
      },
    });
    expect(report.edges.examples.length).toBeLessThanOrEqual(60);
    expect(report.commandBudget.forbiddenCommands).toContain("provider API calls");
    expect(JSON.stringify(report)).not.toContain("process.env");
    expect(JSON.stringify(report)).not.toContain(".env.local");
  });
});
