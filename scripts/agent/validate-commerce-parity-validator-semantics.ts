import fs from "node:fs";

const failures: string[] = [];

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function expectPass(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
const spec = read("tests/unit/commerce-parity-validator-semantics.spec.ts");

expectPass(validation.includes("purchase_telemetry_undercount") && validation.includes("passAllowed: purchaseTelemetryCoverage.passAllowed"), "purchase telemetry missing but passAllowed true.");
expectPass(validation.includes("missingPurchaseTelemetryCount") && spec.includes("telemetryPurchaseCount: 0"), "0 server purchase telemetry events can pass with completed transactions.");
expectPass(validation.includes("Mismatch reason:"), "revenue ledger mismatch lacks reason.");
expectPass(validation.includes("creatorRestrictedSpendViolationCount") && spec.includes("creatorSpendTransactionCount: 15"), "creator spend pass regresses.");
expectPass(validation.includes("comparableUnitsStatus") && validation.includes("firstPartyPurchaseRollupDocumentCount"), "purchase revenue mismatch uses incompatible units without warning.");

if (failures.length > 0) {
  console.error("commerce-parity-validator-semantics failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("commerce-parity-validator-semantics: pass");
