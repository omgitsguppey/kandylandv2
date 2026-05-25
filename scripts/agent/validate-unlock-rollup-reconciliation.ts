import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const helper = read("src/lib/commerce/unlock-rollup-reconciliation.ts");
const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
const report = read("agent/state/unlock-rollup-reconciliation.generated.json");

expect(helper.includes("reconcileUnlockRollups"), "unlock rollup reconciliation helper missing.");
expect(helper.includes("comparable_unlock_count") && helper.includes("rollup_docs_not_unlock_count"), "unlock transactions and rollups can compare incompatible units.");
expect(helper.includes("date_window_mismatch"), "date window mismatch not checked.");
expect(helper.includes("duplicate_rollups"), "duplicate rollups not detected.");
expect(helper.includes("missing_server_unlock_telemetry"), "missing telemetry not tied to mismatch.");
expect(validation.includes("unlockRollupReconciliation.mismatchReason"), "validation row lacks mismatch reason.");
expect(report.includes('"unlockDelta": 98'), "98 delta lacks report classification.");
expect(report.includes('"mismatchReason": "missing_server_unlock_telemetry"'), "unlock mismatch reason missing.");

if (failures.length) {
  console.error("unlock-rollup-reconciliation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("unlock-rollup-reconciliation: pass");
