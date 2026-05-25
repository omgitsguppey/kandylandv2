import fs from "node:fs";

const formulas = fs.readFileSync("src/lib/analytics/telemetry-truth-recovery-formulas.ts", "utf8");
const status = fs.readFileSync("src/lib/analytics/telemetry-truth-recovery-status.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedBehavior.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/telemetry-truth-recovery-formulas.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

["observedViews =", "checkedViews =", "finalViews =", "estimatedRatio =", "confidence ="].forEach((formula) => {
  expect(formulas.includes(formula), `missing formula ${formula}`);
});
expect(status.includes("buildTelemetryTruthRecoveryStatus"), "telemetry recovery status builder missing.");
expect(ui.includes("ACTIONABLE: document"), "formula-missing UI must be actionable.");
expect(tests.includes("keeps observed, checked, final, and estimated layers separate"), "formula separation test missing.");

if (failures.length) {
  console.error("Telemetry truth recovery formulas validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Telemetry truth recovery formulas validator passed.");
