export type TreasuryBureauId =
  | "receipts"
  | "ledger"
  | "appropriations"
  | "obligations"
  | "outlays"
  | "entitlements"
  | "reconciliation"
  | "inspector_general"
  | "public_reporting";

export type TreasuryBureauRecord = {
  bureauId: TreasuryBureauId;
  label: string;
  owner: string;
  canonicalSource: string[];
  inputFacts: string[];
  outputFacts: string[];
  confidenceRules: string[];
  debugLane: string;
  costClass: "source_only" | "bounded_summary" | "runtime_critical";
  privacyClass: "redacted_finance" | "private_user_finance" | "admin_only_summary";
  validator: string;
};

export const TREASURY_BUREAUS: TreasuryBureauRecord[] = [
  {
    bureauId: "receipts",
    label: "Receipts Bureau",
    owner: "platform_economy",
    canonicalSource: ["src/lib/platform-economy.ts", "src/lib/server/platform-economy.ts", "src/app/api/paypal/capture/route.ts"],
    inputFacts: ["provider receipts", "user payments", "GumDrop purchases", "operator-confirmed revenue"],
    outputFacts: ["receipt confidence", "paid source basis", "provider-linked revenue flags"],
    confidenceRules: ["Provider/order artifact is exact.", "Operator confirmation without provider artifact is inferred."],
    debugLane: "admin_economy_treasury",
    costClass: "bounded_summary",
    privacyClass: "redacted_finance",
    validator: "check:treasury-structure-contract",
  },
  {
    bureauId: "ledger",
    label: "Ledger Bureau",
    owner: "gumdrop_ledger_math",
    canonicalSource: ["src/lib/math/gumdrop-ledger-math.ts", "src/lib/gumdrop-ledger.ts", "src/lib/server/gumdrop-ledger.ts"],
    inputFacts: ["paid_gd", "paid_bonus_gd", "reward_gd", "task_reward_gd", "admin_grant_gd", "adjustments", "reversals"],
    outputFacts: ["user balance by source bucket", "paid-only eligibility", "display parity"],
    confidenceRules: ["Paid bundle bonus remains paid_bonus_gd.", "Unknown legacy source is not paid-only eligible."],
    debugLane: "gumdrop_ledger",
    costClass: "runtime_critical",
    privacyClass: "private_user_finance",
    validator: "check:gumdrop-ledger-math",
  },
  {
    bureauId: "appropriations",
    label: "Appropriations Bureau",
    owner: "platform_economy",
    canonicalSource: ["src/lib/platform-economy.ts", "src/lib/tasks/daily-task-reward-ledger.ts"],
    inputFacts: ["user wallet allocation", "reward allocation", "creator entitlement allocation", "promo/bonus allocation"],
    outputFacts: ["allocation source bucket", "allocation confidence"],
    confidenceRules: ["Reward allocation must not become paid-source funding.", "Promo bonus tied to paid package is paid-source bonus."],
    debugLane: "platform_economy_allocations",
    costClass: "bounded_summary",
    privacyClass: "admin_only_summary",
    validator: "check:platform-economy-commerce-controls",
  },
  {
    bureauId: "obligations",
    label: "Obligations Bureau",
    owner: "commerce",
    canonicalSource: ["src/lib/commerce/transaction-source-of-funds-contract.ts", "src/lib/commerce/purchase-journey-normalization.ts"],
    inputFacts: ["pending checkout", "pending unlock", "pending entitlement", "pending refund/reversal"],
    outputFacts: ["pending obligation state", "idempotency requirement"],
    confidenceRules: ["Pending obligation is not revenue.", "Pending entitlement is not access until entitlement resolver grants it."],
    debugLane: "commerce_obligations",
    costClass: "bounded_summary",
    privacyClass: "redacted_finance",
    validator: "check:payment-module-symmetry",
  },
  {
    bureauId: "outlays",
    label: "Outlays Bureau",
    owner: "gumdrop_ledger_math",
    canonicalSource: ["src/lib/math/gumdrop-ledger-math.ts", "src/lib/commerce/unlock-rollup-reconciliation.ts"],
    inputFacts: ["successful unlock spend", "paid chat spend", "Fan Pass spend", "spend by source bucket"],
    outputFacts: ["spend plan", "source-bucket debit"],
    confidenceRules: ["Paid-only spend uses paid_gd and paid_bonus_gd only.", "Refund reverses the original source bucket."],
    debugLane: "gumdrop_outlays",
    costClass: "runtime_critical",
    privacyClass: "private_user_finance",
    validator: "check:gumdrop-ledger-math",
  },
  {
    bureauId: "entitlements",
    label: "Entitlements Bureau",
    owner: "creator_entitlement",
    canonicalSource: ["src/lib/math/creator-revenue-entitlement-math.ts", "src/lib/creator-monetization/creator-entitlement-resolver.ts", "src/lib/fan-pass/fan-pass-access-resolver.ts"],
    inputFacts: ["Fan Pass access", "creator access", "drop access", "chat bypass", "refund/cancel status"],
    outputFacts: ["active/expired/refunded/cancelled entitlement", "access decision"],
    confidenceRules: ["Entitlement is access truth, not payment truth.", "Reversed entitlement cannot grant access."],
    debugLane: "creator_entitlements",
    costClass: "runtime_critical",
    privacyClass: "private_user_finance",
    validator: "check:creator-revenue-entitlement-math",
  },
  {
    bureauId: "reconciliation",
    label: "Reconciliation Bureau",
    owner: "treasury_reconciliation",
    canonicalSource: ["src/lib/treasury/treasury-reconciliation-engine.ts", "src/lib/math/gumdrop-ledger-math.ts", "src/lib/math/creator-revenue-entitlement-math.ts"],
    inputFacts: ["provider receipts vs ledger", "wallet display vs ledger", "creator revenue vs entitlements", "GumDrop source parity"],
    outputFacts: ["matched", "pending review", "audit exception"],
    confidenceRules: ["Wallet display must equal ledger bucket total.", "Creator revenue separates exact, linked, inferred, pending, reversed, and unknown legacy."],
    debugLane: "treasury_reconciliation",
    costClass: "source_only",
    privacyClass: "redacted_finance",
    validator: "check:treasury-reconciliation-engine",
  },
  {
    bureauId: "inspector_general",
    label: "Inspector General",
    owner: "treasury_reconciliation",
    canonicalSource: ["src/lib/treasury/treasury-reconciliation-engine.ts", "src/lib/debug/debug-cockpit-batch22-commerce-truth.ts"],
    inputFacts: ["balance mismatch", "duplicate transaction", "impossible spend", "unknown legacy money", "unverified revenue"],
    outputFacts: ["audit finding", "exception class", "next action"],
    confidenceRules: ["Unknown legacy money becomes an audit exception.", "Unverified revenue cannot display as exact."],
    debugLane: "treasury_inspector_general",
    costClass: "source_only",
    privacyClass: "redacted_finance",
    validator: "check:treasury-reconciliation-engine",
  },
  {
    bureauId: "public_reporting",
    label: "Public Reporting Office",
    owner: "platform_economy",
    canonicalSource: ["src/lib/platform-economy.ts", "src/lib/admin-analytics-commerce-snapshot.ts"],
    inputFacts: ["user wallet display", "creator dashboard revenue", "admin finance summary", "freshness labels"],
    outputFacts: ["redacted report", "confidence-labeled panel", "compact summary"],
    confidenceRules: ["Unknown legacy money cannot display as exact revenue, exact balance, or exact entitlement.", "Reports are compact, redacted, reconcilable, and confidence-labeled."],
    debugLane: "admin_economy_reporting",
    costClass: "bounded_summary",
    privacyClass: "admin_only_summary",
    validator: "check:treasury-structure-contract",
  },
];

export function validateTreasuryStructureContract() {
  const failures: string[] = [];
  const expected: TreasuryBureauId[] = [
    "receipts",
    "ledger",
    "appropriations",
    "obligations",
    "outlays",
    "entitlements",
    "reconciliation",
    "inspector_general",
    "public_reporting",
  ];
  const actual = TREASURY_BUREAUS.map((bureau) => bureau.bureauId);
  for (const bureauId of expected) {
    if (!actual.includes(bureauId)) failures.push(`Missing Treasury bureau: ${bureauId}`);
  }
  for (const bureau of TREASURY_BUREAUS) {
    if (bureau.canonicalSource.length === 0) failures.push(`${bureau.bureauId} lacks canonical source.`);
    if (bureau.confidenceRules.length === 0) failures.push(`${bureau.bureauId} lacks confidence rules.`);
    if (!bureau.debugLane) failures.push(`${bureau.bureauId} lacks debug lane.`);
    if (!bureau.validator) failures.push(`${bureau.bureauId} lacks validator.`);
  }
  const reporting = TREASURY_BUREAUS.find((bureau) => bureau.bureauId === "public_reporting");
  if (!reporting?.confidenceRules.some((rule) => rule.includes("Unknown legacy money cannot display as exact"))) {
    failures.push("Public reporting must block unknown legacy money from exact display.");
  }
  return failures;
}

export function buildTreasuryStructureContractReport(generatedAtUtc = new Date().toISOString()) {
  return {
    reportKey: "treasury-structure-contract",
    generatedAtUtc,
    status: validateTreasuryStructureContract().length === 0 ? "pass" : "fail",
    bureauCount: TREASURY_BUREAUS.length,
    bureaus: TREASURY_BUREAUS.map((bureau) => ({
      bureauId: bureau.bureauId,
      owner: bureau.owner,
      canonicalSource: bureau.canonicalSource,
      debugLane: bureau.debugLane,
      costClass: bureau.costClass,
      privacyClass: bureau.privacyClass,
      validator: bureau.validator,
    })),
    validationFailures: validateTreasuryStructureContract(),
    nextExactSteps: ["Keep route/payment runtime unchanged; wire future finance panels through this owner map."],
  };
}
