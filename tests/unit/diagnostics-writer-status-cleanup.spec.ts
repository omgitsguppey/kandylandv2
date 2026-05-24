import { describe, expect, it } from "vitest";

import {
  buildDiagnosticsWriterStatusCleanupReport,
  validateDiagnosticsWriterStatusCleanupReport,
} from "../../scripts/agent/debug-cockpit-batch15-shared";

describe("diagnostics and downstream writer status cleanup", () => {
  it("classifies empty diagnostics and writer rows as no-sample, not live", () => {
    const report = buildDiagnosticsWriterStatusCleanupReport();

    expect(report.diagnosticsLaneStatusBefore).toBe("LIVE");
    expect(report.diagnosticsLaneStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.diagnosticsSampleLoaded).toBe(false);
    expect(report.diagnosticsProvenZero).toBe(false);
    expect(report.downstreamWriterStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.downstreamWriterSampleLoaded).toBe(false);
    expect(report.sourceWindow).toBe("missing");
    expect(report.realDiagnosticsHidden).toBe(false);
    expect(validateDiagnosticsWriterStatusCleanupReport(report)).toEqual([]);
  });
});
