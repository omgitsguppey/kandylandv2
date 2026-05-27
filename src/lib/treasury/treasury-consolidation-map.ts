export type TreasuryConsolidationAction =
  | "keep_canonical"
  | "move_under_treasury_alias"
  | "reinforce_into_bureau"
  | "remove_duplicate"
  | "legacy_alias"
  | "unsafe_unknown";

export type TreasuryConsolidationEntry = {
  concept: string;
  bureau: string;
  existingOwner: string;
  sourceFiles: string[];
  action: TreasuryConsolidationAction;
  duplicatesMath: false;
  runtimeTouched: false;
  reason: string;
};

export const TREASURY_CONSOLIDATION_MAP: TreasuryConsolidationEntry[] = [
  {
    concept: "platform economy treasury summary",
    bureau: "receipts/public_reporting",
    existingOwner: "src/lib/platform-economy.ts",
    sourceFiles: ["src/lib/platform-economy.ts", "src/lib/server/platform-economy.ts", "src/app/api/admin/economy/treasury/route.ts"],
    action: "keep_canonical",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Existing Platform Economy is already the admin GumDrops treasury and commerce control surface.",
  },
  {
    concept: "GumDrop ledger source-of-funds",
    bureau: "ledger/outlays/reconciliation",
    existingOwner: "src/lib/math/gumdrop-ledger-math.ts",
    sourceFiles: ["src/lib/math/gumdrop-ledger-math.ts", "src/lib/gumdrop-source-of-funds.ts", "src/lib/commerce/transaction-source-of-funds-contract.ts"],
    action: "reinforce_into_bureau",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Treasury references the existing ledger math and does not recalculate balances.",
  },
  {
    concept: "creator revenue and entitlement confidence",
    bureau: "entitlements/reconciliation/public_reporting",
    existingOwner: "src/lib/math/creator-revenue-entitlement-math.ts",
    sourceFiles: ["src/lib/math/creator-revenue-entitlement-math.ts", "src/lib/creator-monetization/creator-entitlement-contract.ts", "src/lib/fan-pass/fan-pass-lifecycle-contract.ts"],
    action: "reinforce_into_bureau",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Creator revenue confidence already separates exact, linked, inferred, pending, reversed, and unknown legacy buckets.",
  },
  {
    concept: "commerce transaction source truth",
    bureau: "obligations/reconciliation",
    existingOwner: "src/lib/commerce/transaction-source-of-funds-contract.ts",
    sourceFiles: ["src/lib/commerce/transaction-source-of-funds-contract.ts", "src/lib/commerce/commerce-rollup-reconciliation.ts"],
    action: "reinforce_into_bureau",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Commerce source-of-funds remains the canonical source for purchase/unlock transaction classification.",
  },
  {
    concept: "task reward credits",
    bureau: "appropriations/ledger",
    existingOwner: "src/lib/tasks/daily-task-reward-ledger.ts",
    sourceFiles: ["src/lib/tasks/daily-task-reward-ledger.ts"],
    action: "reinforce_into_bureau",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Task rewards remain reward-source credits and are reconciled into ledger buckets.",
  },
  {
    concept: "cost and billing risk",
    bureau: "inspector_general/public_reporting",
    existingOwner: "src/lib/cost",
    sourceFiles: ["src/lib/cost/billing-spike-risk-score.ts", "src/lib/server/global-cost-surface-contract.ts"],
    action: "keep_canonical",
    duplicatesMath: false,
    runtimeTouched: false,
    reason: "Cost evidence remains a separate guardrail and Treasury reports only reference compact risk labels.",
  },
];

export function validateTreasuryConsolidationMap() {
  const failures: string[] = [];
  for (const entry of TREASURY_CONSOLIDATION_MAP) {
    if (!entry.existingOwner) failures.push(`${entry.concept} lacks existing owner.`);
    if (entry.duplicatesMath) failures.push(`${entry.concept} duplicates math.`);
    if (entry.runtimeTouched) failures.push(`${entry.concept} changed runtime.`);
    if (entry.action === "unsafe_unknown") failures.push(`${entry.concept} remains unsafe_unknown.`);
  }
  if (!TREASURY_CONSOLIDATION_MAP.some((entry) => entry.existingOwner.includes("platform-economy"))) {
    failures.push("Platform Economy owner missing.");
  }
  if (!TREASURY_CONSOLIDATION_MAP.some((entry) => entry.existingOwner.includes("gumdrop-ledger-math"))) {
    failures.push("GumDrop ledger math owner missing.");
  }
  return failures;
}

export function buildTreasuryConsolidationMapReport(generatedAtUtc = new Date().toISOString()) {
  return {
    reportKey: "treasury-consolidation-map",
    generatedAtUtc,
    status: validateTreasuryConsolidationMap().length === 0 ? "pass" : "fail",
    entries: TREASURY_CONSOLIDATION_MAP,
    duplicateMathRemoved: "No duplicate Treasury math added; Treasury points to existing canonical owners.",
    wrappersCreated: 0,
    validationFailures: validateTreasuryConsolidationMap(),
  };
}
