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
});
