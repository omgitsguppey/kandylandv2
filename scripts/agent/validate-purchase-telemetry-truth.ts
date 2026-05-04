import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const paypalCreateRoute = readRequired("src/app/api/paypal/create/route.ts");
const paypalCaptureRoute = readRequired("src/app/api/paypal/capture/route.ts");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const gumdropLedger = readRequired("src/lib/gumdrop-ledger.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const serverAnalytics = readRequired("src/lib/server/analytics.ts");
const adminHistoricalRoute = readRequired("src/app/api/admin/analytics/historical/route.ts");
const adminUserRoute = readRequired("src/app/api/admin/user/[userId]/route.ts");

if (packageJson.scripts?.["check:purchase-telemetry-truth"] !== "tsx scripts/agent/validate-purchase-telemetry-truth.ts") {
  failures.push("package.json must expose check:purchase-telemetry-truth.");
}

requireIncludes(paypalCreateRoute, "transactionId", "PayPal create route");
requireIncludes(paypalCaptureRoute, 'trackServerEvent("purchase_verified"', "PayPal capture route");
requireIncludes(paypalCaptureRoute, 'sourceTruth: "canonical"', "PayPal capture canonical purchase telemetry");
requireIncludes(paypalCaptureRoute, 'transaction_id: result.transactionId ?? orderId', "PayPal capture transaction id telemetry");
requireIncludes(paypalCaptureRoute, 'sourceTruth: "server_purchase_transaction"', "PayPal capture ledger source truth");
requireIncludes(paypalCaptureRoute, "transactionId: result.transactionId ?? orderId", "PayPal capture response transaction id");

requireIncludes(purchaseModal, 'sourceTruth: "client_funnel"', "Purchase modal begin checkout telemetry");
requireIncludes(purchaseModal, 'sourceTruth: "client_supporting"', "Purchase modal supporting purchase telemetry");
requireIncludes(purchaseModal, "transaction_id: transactionId", "Purchase modal transaction id telemetry");
requireIncludes(purchaseModal, "order_id: orderId", "Purchase modal order id telemetry");

requireIncludes(gumdropLedger, "isCanonicalPurchaseTransaction", "Gumdrop ledger canonical purchase gate");
requireIncludes(gumdropLedger, 'input.sourceTruth.startsWith("client")', "Gumdrop ledger client revenue exclusion");
requireIncludes(gumdropLedger, "verifiedServerSide === false", "Gumdrop ledger server verification gate");

requireIncludes(identifiedIngestRoute, 'canonicalEventName === "purchase_verified"', "Identified ingest canonical purchase truth");
requireIncludes(identifiedIngestRoute, 'canonicalEventName === "gumdrops_purchase_completed" || canonicalEventName === "purchase"', "Identified ingest client purchase support truth");
requireIncludes(identifiedIngestRoute, 'explicitSourceTruth === "client_supporting"', "Identified ingest explicit client-supporting truth");

requireIncludes(serverAnalytics, 'canonicalEventName === "purchase_verified" ? "canonical"', "Server analytics canonical purchase truth");
requireIncludes(serverAnalytics, 'readStringParam(enrichedParams, "transaction_id", "transactionId"', "Server analytics transaction id persistence");

requireIncludes(adminHistoricalRoute, 'const telemetryPurchaseCount = eventsData.purchase_verified || 0;', "Admin historical server purchase fallback");
requireIncludes(adminHistoricalRoute, "const purchases = firstPartyPurchaseCount > 0", "Admin historical transaction-first purchase count");
requireIncludes(adminUserRoute, "const directPurchaseCount = purchaseVerifiedFactCount;", "Admin user route server purchase fact count");
requireIncludes(adminUserRoute, '{ key: "facts", label: "Server facts", count: directPurchaseCount }', "Admin user route purchase fact labeling");

if (failures.length > 0) {
  console.error("Purchase telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Purchase telemetry truth validator passed.");
