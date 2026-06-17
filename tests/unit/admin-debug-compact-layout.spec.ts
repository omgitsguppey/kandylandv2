import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin debug compact layout", () => {
    it("keeps the Now tab summary-first with one collapsed source drilldown drawer", () => {
        const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugTabNow.tsx"), "utf8");

        expect(source).toContain('data-admin-debug-now-density="single_drilldown_drawer"');
        expect(source).toContain('data-admin-debug-now-detail-default="collapsed"');
        expect(source).toContain('title="Current source drilldowns"');
        expect(source).toContain('defaultOpen={false}');
        expect(source).toContain('<DebugTelemetryHealthSummary telemetryHealth={data?.telemetryHealth} />');
        expect(source).toContain('<DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />');
        expect(source).toContain('<DebugCreatorLane data={data} />');
        expect(source).toContain("<DebugNowDiagnostics");
        expect(source).toContain("data-debug-health-freshness={healthFreshnessState}");
        expect(source).toContain("data-debug-business-truth-state={controlTowerBusinessTruthState}");
    });

    it("compresses system health details into one source drawer with collapsed raw samples", () => {
        const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugTabNow.tsx"), "utf8");

        expect(source).toContain('data-admin-debug-health-layout="compact_strip"');
        expect(source).toContain('data-admin-debug-health-summary-card-count="4"');
        expect(source).toContain('data-admin-debug-raw-samples-default="collapsed"');
        expect(source).toContain('title="Raw health samples"');
        expect(source).toContain('defaultOpen={false}');
        expect(source).not.toContain('className="grid gap-4 lg:grid-cols-1"');
        expect(source).not.toContain('className="grid gap-3 md:grid-cols-2 lg:grid-cols-1"');
    });

    it("removes redundant visible score-heavy containers while preserving debug evidence metadata", () => {
        const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugTabNow.tsx"), "utf8");

        expect(source).toContain('data-admin-debug-now-layout="triage_strip_plus_source_drawer"');
        expect(source).toContain('data-admin-debug-source-drawer-count="1"');
        expect(source).toContain("data-debug-score-penalty-count={systemHealthNow.score.penaltyCount}");
        expect(source).toContain('data-admin-debug-raw-samples-default="collapsed"');
        expect(source).not.toContain('title="System health now"');
        expect(source).not.toContain("systemHealthSummary");
        expect(source).not.toContain('data-admin-debug-health-summary-card-count="5"');
        expect(source).not.toContain('label: "Score penalties"');
        expect(source).not.toContain("Score penalties");
    });

    it("prevents empty tracking and telemetry lane summaries from rendering as healthy zero counts", () => {
        const telemetry = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugTelemetryHealthSummary.tsx"), "utf8");
        const tracking = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx"), "utf8");

        expect(telemetry).toContain('const DEBUG_TELEMETRY_NOT_LOADED = "Not loaded";');
        expect(telemetry).toContain("valueWhenTelemetryLoaded(telemetryLoaded, summary.live ?? 0)");
        expect(telemetry).toContain('telemetryLoaded ? "live" : "unavailable"');
        expect(telemetry).not.toContain('<Pill label="Live" value={summary.live ?? 0} tone="good" truthState="live" />');

        expect(tracking).toContain('const DEBUG_TRACKING_NOT_LOADED = "Not loaded";');
        expect(tracking).toContain("valueWhenTrackingLoaded(trackingLoaded, p1Count)");
        expect(tracking).toContain('trackingLoaded ? p1Count > 0 ? "failed" : "live" : "unavailable"');
        expect(tracking).not.toContain('<Pill label="P1" value={p1Count} tone={p1Count > 0 ? "bad" : "good"} truthState={p1Count > 0 ? "failed" : "live"} />');
    });
});
