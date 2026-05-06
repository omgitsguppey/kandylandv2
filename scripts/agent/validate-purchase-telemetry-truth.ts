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
const commerceSnapshotHelper = readRequired("src/lib/admin-analytics-commerce-snapshot.ts");
const deterministicTruth = readRequired("src/lib/deterministic-admin-truth.ts");

if (packageJson.scripts?.["check:purchase-telemetry-truth"] !== "tsx scripts/agent/validate-purchase-telemetry-truth.ts") {
  failures.push("package.json must expose check:purchase-telemetry-truth.");
}

requireIncludes(paypalCreateRoute, "transactionId", "PayPal create route");
requireIncludes(paypalCaptureRoute, 'trackServerEvent("server_purchase_verified"', "PayPal capture route");
requireIncludes(paypalCaptureRoute, 'sourceTruth: "canonical"', "PayPal capture canonical purchase telemetry");
requireIncludes(paypalCaptureRoute, 'transaction_id: result.transactionId ?? orderId', "PayPal capture transaction id telemetry");
requireIncludes(paypalCaptureRoute, 'paypal_capture_id: capture.id', "PayPal capture PayPal capture id telemetry");
requireIncludes(paypalCaptureRoute, 'value_usd: paidUsd', "PayPal capture USD telemetry");
requireIncludes(paypalCaptureRoute, 'paid_gumdrops: economics.paidGumDrops', "PayPal capture paid GumDrops telemetry");
requireIncludes(paypalCaptureRoute, 'bonus_gumdrops: economics.bonusGumDrops', "PayPal capture bonus GumDrops telemetry");
requireIncludes(paypalCaptureRoute, 'sourceTruth: "server_purchase_transaction"', "PayPal capture ledger source truth");
requireIncludes(paypalCaptureRoute, "transactionId: result.transactionId ?? orderId", "PayPal capture response transaction id");

requireIncludes(purchaseModal, 'sourceTruth: "client_funnel"', "Purchase modal begin checkout telemetry");
requireIncludes(purchaseModal, 'sourceTruth: "client_supporting"', "Purchase modal supporting purchase telemetry");
requireIncludes(purchaseModal, "transaction_id: transactionId", "Purchase modal transaction id telemetry");
requireIncludes(purchaseModal, "order_id: orderId", "Purchase modal order id telemetry");

requireIncludes(gumdropLedger, "isCanonicalPurchaseTransaction", "Gumdrop ledger canonical purchase gate");
requireIncludes(gumdropLedger, 'input.sourceTruth.startsWith("client")', "Gumdrop ledger client revenue exclusion");
requireIncludes(gumdropLedger, "verifiedServerSide === false", "Gumdrop ledger server verification gate");

requireIncludes(identifiedIngestRoute, 'canonicalEventName === "server_purchase_verified"', "Identified ingest canonical purchase truth");
requireIncludes(identifiedIngestRoute, 'canonicalEventName === "gumdrops_purchase_completed" || canonicalEventName === "purchase"', "Identified ingest client purchase support truth");
requireIncludes(identifiedIngestRoute, 'explicitSourceTruth === "client_supporting"', "Identified ingest explicit client-supporting truth");

requireIncludes(serverAnalytics, 'canonicalEventName === "server_purchase_verified" ? "canonical"', "Server analytics canonical purchase truth");
requireIncludes(serverAnalytics, 'readStringParam(enrichedParams, "transaction_id", "transactionId"', "Server analytics transaction id persistence");

requireIncludes(adminHistoricalRoute, 'const telemetryPurchaseCount = sumEventCounts(canonicalEventCounts, [', "Admin historical purchase telemetry count");
requireIncludes(adminHistoricalRoute, '"server_purchase_verified"', "Admin historical canonical server purchase alias");
requireIncludes(adminHistoricalRoute, '"purchase_verified"', "Admin historical legacy purchase alias");
requireIncludes(adminHistoricalRoute, '"paypal_capture_completed"', "Admin historical capture alias");
requireIncludes(adminHistoricalRoute, '"purchase_completed"', "Admin historical completed alias");
requireIncludes(adminHistoricalRoute, "const purchases = firstPartyPurchaseCount > 0", "Admin historical transaction-first purchase count");
requireIncludes(adminUserRoute, "const directPurchaseCount = purchaseVerifiedFactCount;", "Admin user route server purchase fact count");
requireIncludes(adminUserRoute, 'event.eventName === "server_purchase_verified" || event.eventName === "purchase_verified"', "Admin user route canonical and legacy server purchase fact count");
requireIncludes(adminUserRoute, '{ key: "facts", label: "Server facts", count: directPurchaseCount }', "Admin user route purchase fact labeling");
requireIncludes(commerceSnapshotHelper, "safeRate", "Commerce Snapshot conversion guard");
requireIncludes(commerceSnapshotHelper, "commerce_checkout_bridge", "Commerce Snapshot bridge source guard");
requireIncludes(deterministicTruth, "unavailable: mismatched source/range", "Deterministic rate guard");
requireIncludes(readRequired("src/lib/telemetry-catalog.ts"), 'eventName: "server_purchase_verified"', "Telemetry catalog canonical server purchase event");
requireIncludes(readRequired("src/lib/telemetry-catalog.ts"), 'aliases: ["purchase_verified", "paypal_capture_completed", "purchase_completed"]', "Telemetry catalog purchase aliases");
requireIncludes(readRequired("src/lib/behavioral/normalize-event-fact.ts"), 'server_purchase_verified: { normalizedAction: "gumdrops_purchased"', "Event fact normalization canonical server purchase alias");
requireIncludes(readRequired("src/lib/behavioral/normalize-event-fact.ts"), 'paypal_capture_completed: { normalizedAction: "gumdrops_purchased"', "Event fact normalization PayPal capture alias");
requireIncludes(readRequired("src/lib/server/admin-analytics-historical-validation.ts"), 'checkKey: "purchase_revenue_truth"', "Validation helper purchase revenue truth row");
requireIncludes(readRequired("src/lib/server/admin-analytics-historical-validation.ts"), 'checkKey: "purchase_funnel_telemetry"', "Validation helper purchase funnel telemetry row");
requireIncludes(readRequired("src/lib/server/admin-analytics-historical-validation.ts"), '"purchase_telemetry_undercount"', "Validation helper purchase telemetry blocked reason");
requireIncludes(readRequired("src/lib/server/admin-analytics-historical-validation.ts"), "Missing purchase telemetry:", "Validation helper missing purchase telemetry detail");

if (failures.length > 0) {
  console.error("Purchase telemetry truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Purchase telemetry truth validator passed.");
