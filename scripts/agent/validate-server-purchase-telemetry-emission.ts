import fs from "node:fs";

const failures: string[] = [];

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function expectPass(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const route = read("src/app/api/paypal/capture/route.ts");
const analytics = read("src/lib/server/analytics.ts");
const contract = read("src/lib/commerce/commerce-parity-contract.ts");

expectPass(route.includes("buildServerPurchaseTelemetryEvent"), "PayPal capture success can create ledger transaction without canonical server purchase telemetry path.");
expectPass(route.includes("trackServerEvent(purchaseTelemetryEvent.eventName"), "PayPal capture does not emit the canonical purchase telemetry event.");
expectPass(contract.includes("idempotency_key") && analytics.includes('"event_id", "eventId", "idempotency_key", "idempotencyKey"'), "event lacks idempotency key.");
expectPass(contract.includes("CANONICAL_SERVER_PURCHASE_EVENT_NAME") && contract.includes("sanitizeIdPart(transactionId)") && contract.includes("sanitizeIdPart(orderId)"), "event can double-count instead of using deterministic transaction/order idempotency.");
expectPass(contract.includes("transaction_id") && contract.includes("provider_order_ref") && contract.includes("provider_capture_ref"), "event lacks transaction/provider linkage.");
expectPass(contract.includes("gross_revenue_cents") && contract.includes("delivered_gumdrops") && contract.includes("paid_gumdrops") && contract.includes("bonus_gumdrops"), "event lacks revenue/GD delivered fields.");
expectPass(route.includes("deriveGumdropEconomics") && !route.includes("paidGumDrops +") && !route.includes("bonusGumDrops +"), "payment runtime math changes detected.");
expectPass(read("tests/unit/server-purchase-telemetry-emission.spec.ts").includes("buildServerPurchaseTelemetryEvent"), "provider API call occurs in tests or helper test missing.");

if (failures.length > 0) {
  console.error("server-purchase-telemetry-emission failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("server-purchase-telemetry-emission: pass");
