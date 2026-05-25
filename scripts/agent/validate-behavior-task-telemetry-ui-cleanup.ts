import fs from "node:fs";

const files = [
  "src/app/admin/debug/components/DebugAdvancedTruth.tsx",
  "src/app/admin/debug/components/DebugAdvancedBehavior.tsx",
  "src/app/admin/debug/components/DebugAdvancedDrift.tsx",
  "src/app/admin/debug/components/DebugAdvancedTelemetry.tsx",
  "src/app/admin/debug/components/DebugAdvancedExperiments.tsx",
];
const combined = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const tests = fs.readFileSync("tests/unit/behavior-task-telemetry-ui-cleanup.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(combined.includes("Source state"), "zero-shell panels must show source state.");
expect(combined.includes("badgeForSourceStatus"), "source status badge helper missing.");
expect(combined.includes("ACTIONABLE"), "formula/source missing states must be actionable.");
expect(combined.includes("<details"), "raw diagnostics should remain drilldown.");
expect(!combined.includes("0/0 ratios show live"), "bad placeholder detected.");
expect(tests.includes("surfaces source status"), "UI cleanup test missing.");

if (failures.length) {
  console.error("Behavior/task telemetry UI cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Behavior/task telemetry UI cleanup validator passed.");
