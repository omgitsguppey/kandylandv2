import fs from "node:fs";

const failures: string[] = [];

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function expectPass(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const source = read("src/lib/commerce/commerce-rollup-reconciliation.ts");
const validation = read("src/lib/server/admin-analytics-historical-validation.ts");

expectPass(source.includes("rollupPurchaseCount") && source.includes("rollupDocumentCount") && source.includes("rollup_docs_not_purchase_count"), "completed transactions and rollups compare incompatible units.");
expectPass(source.includes("date_window_mismatch") && source.includes("dateWindowStatus"), "date window mismatch not checked.");
expectPass(source.includes("duplicate_rollups") && source.includes("duplicateRollupIds"), "duplicate rollups not detected.");
expectPass(source.includes("telemetry_missing") && validation.includes("telemetryEventCount: input.telemetryPurchaseCount"), "missing telemetry not tied to rollup mismatch.");
expectPass(source.includes("source_mismatch") && source.includes("Mismatch reason:"), "mismatch reason unknown with count delta.");
expectPass(validation.includes("confidence: commerceParityCheck.revenueTruth.confidence"), "confidence below threshold displays pass.");

if (failures.length > 0) {
  console.error("commerce-rollup-reconciliation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("commerce-rollup-reconciliation: pass");
