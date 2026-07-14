import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const route = read("src/app/api/drops/unlock/route.ts");
const contract = read("src/lib/commerce/unlock-watch-parity-contract.ts");
const test = read("tests/unit/server-unlock-telemetry-emission.spec.ts");
const report = read("agent/state/server-unlock-telemetry-emission.generated.json");

expect(contract.includes('CANONICAL_SERVER_UNLOCK_EVENT_NAME = "drop_unlocked"'), "canonical server unlock event missing.");
expect(contract.includes("buildServerUnlockTelemetryEvent"), "server unlock telemetry builder missing.");
expect(contract.includes("idempotency_key: eventId"), "unlock event lacks idempotency key.");
expect(contract.includes("transaction_id") && contract.includes("drop_id") && contract.includes("user_id"), "unlock event lacks transaction/drop/user linkage.");
expect(contract.includes("purchased_amount_spent") && contract.includes("reward_amount_spent"), "unlock event lacks spend source split.");
expect(route.includes("buildServerUnlockTelemetryEvent"), "unlock route can create unlock_content transaction without canonical server unlock telemetry path.");
expect(route.includes("!result.alreadyUnlocked"), "already-unlocked path must not emit success telemetry.");
expect(route.includes("entitlement_granted:${result.transactionId || result.entitlementId}:${dropId}"), "entitlement telemetry must not reuse canonical unlock event id.");
expect(!route.includes("spendSourceAwareGumdrops(sourceAwareBalance, unlockCost +"), "unlock/GumDrop spend math changed.");
expect(test.includes("invalid unlock failures emit success telemetry") || route.includes("!result.alreadyUnlocked"), "invalid unlock failures can emit success telemetry.");
expect(report.includes('"sourcePatchApplied": true'), "server unlock telemetry report missing source patch confirmation.");

if (failures.length) {
  console.error("server-unlock-telemetry-emission failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("server-unlock-telemetry-emission: pass");
