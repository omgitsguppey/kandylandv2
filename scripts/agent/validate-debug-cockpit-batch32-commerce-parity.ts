import fs from "node:fs";

const report = JSON.parse(fs.readFileSync("agent/state/debug-cockpit-batch32-commerce-parity.generated.json", "utf8"));
const failures: string[] = [];

function expectPass(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

expectPass(report.serverPurchaseTelemetryCountAfter >= 0 && report.idempotencyStatus === "idempotent_event_id", "completed purchase transactions exist but server purchase telemetry path missing.");
expectPass(report.purchaseTelemetryMissingCountAfter >= 0 && report.remainingGaps.length > 0, "purchase telemetry count remains 0 without explicit blocker.");
expectPass(report.revenueMismatchReasonAfter !== "unknown", "purchase rollup mismatch lacks reason.");
expectPass(report.comparableUnitsStatus !== "incompatible_units", "rollup/transaction counts use incompatible units without classification.");
expectPass(report.idempotencyStatus === "idempotent_event_id", "purchase telemetry can double-count.");
expectPass(report.creatorSpendStatus === "pass", "creator spend parity regresses.");
expectPass(report.gumdropMathChanged === false, "GumDrop math changes detected.");
expectPass(report.paymentRuntimeChanged === "telemetry_emission_only", "payment runtime changes outside telemetry emission.");
expectPass(Array.isArray(report.scoreDimensions) && report.scoreDimensions.length >= 5, "score dimensions missing.");
expectPass(Array.isArray(report.dirtyClassifications) && report.dirtyClassifications.every((entry: { classification: string }) => entry.classification !== "unsafe_unknown"), "dirty files unclassified.");
expectPass(Array.isArray(report.openPrClassifications) && report.openPrClassifications.length === 0, "open PRs unclassified.");

if (failures.length > 0) {
  console.error("debug-cockpit-batch32-commerce-parity failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("debug-cockpit-batch32-commerce-parity: pass");
