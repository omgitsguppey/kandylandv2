import fs from "node:fs";
import { describe, expect, it } from "vitest";

const truthUi = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedTruth.tsx", "utf8");
const behaviorUi = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedBehavior.tsx", "utf8");
const driftUi = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedDrift.tsx", "utf8");
const telemetryUi = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedTelemetry.tsx", "utf8");
const experimentsUi = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedExperiments.tsx", "utf8");

describe("behavior task telemetry UI cleanup", () => {
  it("surfaces source status instead of plain loaded zero shells", () => {
    const combined = [truthUi, behaviorUi, driftUi, telemetryUi, experimentsUi].join("\n");

    expect(combined).toContain("Source state");
    expect(combined).toContain("badgeForSourceStatus");
    expect(combined).toContain("truthStateForSourceStatus");
    expect(combined).toContain("toneForSourceStatus");
    expect(behaviorUi).toContain("const DEBUG_VALUE_NOT_LOADED = \"Not loaded\"");
    expect(behaviorUi).toContain("const behaviorPanelLoaded = Boolean(panel)");
    expect(behaviorUi).toContain("const recoveryPanelLoaded = Boolean(recoveryPanel)");
    expect(behaviorUi).toContain("value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.dropProfiles)}");
    expect(behaviorUi).toContain("value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.userMetricCount)}");
    expect(behaviorUi).not.toContain('<Pill label="Drop profiles" value={panel?.dropProfiles ?? 0} truthState="live"');
    expect(behaviorUi).not.toContain('<Pill label="User metrics" value={recoveryPanel?.userMetricCount ?? 0} truthState="live"');
  });

  it("makes formula-missing states actionable in telemetry recovery", () => {
    expect(behaviorUi).toContain("Observed formula missing. ACTIONABLE");
    expect(behaviorUi).toContain("Checked formula missing. ACTIONABLE");
    expect(behaviorUi).toContain("Final formula missing. ACTIONABLE");
    expect(behaviorUi).toContain("Estimated formula missing. ACTIONABLE");
  });

  it("keeps raw diagnostic details behind drilldown controls", () => {
    expect(behaviorUi).toContain("<details");
    expect(truthUi).toContain("<details");
    expect(telemetryUi).toContain("Raw trigger details");
  });
});
