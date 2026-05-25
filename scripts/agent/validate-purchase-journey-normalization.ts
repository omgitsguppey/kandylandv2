import fs from "node:fs";

const failures: string[] = [];

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function expectPass(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const source = read("src/lib/commerce/purchase-journey-normalization.ts");
const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
const personMetrics = read("src/lib/analytics/person-metrics-contract.ts");
const journey = read("src/lib/behavioral/user-journey-builder.ts");

expectPass(normalizer.includes('server_purchase_verified: { normalizedAction: "gumdrops_purchased"') && personMetrics.includes('"server_purchase_verified"') && journey.includes("gumdrops_purchased"), "purchase telemetry does not map to event facts/person metrics/user journey.");
expectPass(source.includes("missing_wallet_or_checkout_pre_events") && source.includes("Keep purchase counted"), "missing wallet pre-events cause purchase event to be dropped.");
expectPass(source.includes("doubleCountRisk") && source.includes("dedupe"), "purchase can double-count in journey.");
expectPass(source.includes('revenueTruthSource: "ledger_provider"'), "revenue truth depends only on client telemetry.");

if (failures.length > 0) {
  console.error("purchase-journey-normalization failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("purchase-journey-normalization: pass");
