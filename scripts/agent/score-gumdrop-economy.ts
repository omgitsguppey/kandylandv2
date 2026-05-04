import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type EconomySeverity = "info" | "minor" | "moderate" | "major" | "critical";
type EconomyCategory =
  | "purchase_credit"
  | "reward_credit"
  | "creator_paid_spend"
  | "normal_drop_spend"
  | "transaction_metadata"
  | "wallet_ui_boundary"
  | "test_coverage";

type EconomyFinding = {
  id: string;
  severity: EconomySeverity;
  category: EconomyCategory;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
};

type EconomyReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  findings: EconomyFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedFiles: string[];
  rules: string[];
  summary: string;
};

const root = process.cwd();
const REPORT_PATH = "agent/state/gumdrop-economy-score.generated.json";

const severityImpact: Record<EconomySeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const checkedFiles = [
  "src/lib/gumdrop-ledger.ts",
  "src/lib/gumdrop-economics.ts",
  "src/app/api/paypal/capture/route.ts",
  "src/app/api/checkin/route.ts",
  "src/lib/server/daily-tasks.ts",
  "src/app/api/user/complete-onboarding/route.ts",
  "src/app/api/user/register/route.ts",
  "src/app/api/admin/balance/route.ts",
  "src/lib/server/creator-experiences.ts",
  "src/lib/server/chat.ts",
  "src/app/api/creator/subscriptions/route.ts",
  "src/app/api/creator/requests/route.ts",
  "src/app/api/creator/bookings/route.ts",
  "src/app/api/drops/unlock/route.ts",
  "tests/unit/gumdrop-ledger.spec.ts",
  "tests/unit/paypal-capture-route.spec.ts",
  "tests/unit/lib/gumdrop-economics.spec.ts",
] as const;

const rules = [
  "paid package base GumDrops credit purchased balance",
  "paid package bonus GumDrops credit purchased balance",
  "daily task referral onboarding rewards credit reward balance",
  "creator monetization spends purchased balance only",
  "normal Drop unlocks may use total source-aware balance",
  "purchase transactions preserve paidGumDrops bonusGumDrops and delivered totals",
  "wallet UI is not required to expose source split everywhere",
];

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readIfExists(filePath: string) {
  const absolutePath = join(root, filePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function lineOf(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  return source.slice(0, index).split(/\r?\n/u).length;
}

function excerptOf(source: string, needle: string) {
  return source.split(/\r?\n/u).find((line) => line.includes(needle))?.trim();
}

function addFinding(findings: EconomyFinding[], input: Omit<EconomyFinding, "id" | "scoreImpact">) {
  findings.push({
    ...input,
    id: `gumdrop-economy-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
  });
}

function requireText(
  findings: EconomyFinding[],
  filePath: string,
  expected: string,
  input: Pick<EconomyFinding, "severity" | "category" | "title" | "suggestedFix" | "escalation">,
) {
  const source = readIfExists(filePath);
  if (!source) {
    addFinding(findings, {
      ...input,
      severity: "critical",
      filePath,
      suggestedFix: `Restore ${filePath} or update the economy score allowlist to the new canonical owner.`,
      canAutofix: false,
    });
    return;
  }
  if (!source.includes(expected)) {
    addFinding(findings, {
      ...input,
      filePath,
      canAutofix: false,
    });
  }
}

function forbidText(
  findings: EconomyFinding[],
  filePath: string,
  forbidden: string,
  input: Pick<EconomyFinding, "severity" | "category" | "title" | "suggestedFix" | "escalation">,
) {
  const source = readIfExists(filePath);
  if (!source || !source.includes(forbidden)) return;
  addFinding(findings, {
    ...input,
    filePath,
    line: lineOf(source, forbidden),
    excerpt: excerptOf(source, forbidden),
    canAutofix: false,
  });
}

function collectFindings() {
  const findings: EconomyFinding[] = [];

  for (const expected of [
    "buildPaidPurchaseBalanceCredit",
    "purchasedCreditGumDrops: deliveredGumDrops",
    "rewardCreditGumDrops: 0",
    "purchaseBonusGumDrops: bonusGumDrops",
    "paid_purchase_including_bonus",
    "gumdropPurchaseTotal: purchaseCredit?.purchasedCreditGumDrops ?? 0",
    "gumdropPurchaseBonusTotal: purchaseCredit?.purchaseBonusGumDrops ?? 0",
    "gumdropRewardTotal: isRewardTransaction ? positiveAmount : 0",
  ]) {
    requireText(findings, "src/lib/gumdrop-ledger.ts", expected, {
      severity: "critical",
      category: "purchase_credit",
      title: `Ledger must preserve purchase source truth: ${expected}`,
      suggestedFix: "Review src/lib/gumdrop-ledger.ts and restore paid purchase bonus-as-purchased classification.",
      escalation: "Do not autofix ledger accounting; this affects paid-source spend eligibility.",
    });
  }

  for (const forbidden of [
    "rewardCreditGumDrops: bonusGumDrops",
    "gumdropRewardTotal: isPurchaseTransaction",
    "gumdropPurchaseTotal: paidGumDrops",
  ]) {
    forbidText(findings, "src/lib/gumdrop-ledger.ts", forbidden, {
      severity: "critical",
      category: "purchase_credit",
      title: `Ledger contains forbidden paid/reward source split: ${forbidden}`,
      suggestedFix: "Keep paid package bonuses as purchased-source credit and expose bonus only as purchase metadata.",
      escalation: "Escalate to economy owner before changing source-of-funds logic.",
    });
  }

  for (const expected of [
    "paidGumDrops",
    "bonusGumDrops",
    "deliveredGumDrops",
    "bonusValueBasis: \"package_effective_rate\"",
  ]) {
    requireText(findings, "src/lib/gumdrop-economics.ts", expected, {
      severity: "major",
      category: "transaction_metadata",
      title: `Economics helper must preserve purchase metadata: ${expected}`,
      suggestedFix: "Restore paid, bonus, delivered, and package-rate metadata in deriveGumdropEconomics.",
      escalation: "Escalate because purchase metadata feeds wallet, admin, PayPal capture, and analytics truth.",
    });
  }

  for (const expected of [
    "buildPaidPurchaseBalanceCredit",
    "purchaseCredit.purchasedCreditGumDrops",
    "creditSourceAwareGumdrops(",
    "\"purchased\"",
    "purchaseBonusGumDrops",
    "purchasedBalanceCreditGumDrops",
    "rewardBalanceCreditGumDrops",
    "purchaseSourceClassification",
    "paidGumDrops: economics.paidGumDrops",
    "bonusGumDrops: economics.bonusGumDrops",
    "deliveredGumDrops: economics.deliveredGumDrops",
  ]) {
    requireText(findings, "src/app/api/paypal/capture/route.ts", expected, {
      severity: "critical",
      category: "purchase_credit",
      title: `PayPal capture must credit paid package truth: ${expected}`,
      suggestedFix: "Restore PayPal capture to build purchase credit from delivered paid packages and credit purchased balance.",
      escalation: "Do not autofix PayPal capture; payment write behavior needs route tests and security review.",
    });
  }
  forbidText(findings, "src/app/api/paypal/capture/route.ts", "creditSourceAwareGumdrops(nextSourceAwareBalance, economics.bonusGumDrops, \"reward\")", {
    severity: "critical",
    category: "purchase_credit",
    title: "PayPal capture must not credit paid package bonus GumDrops as reward source",
    suggestedFix: "Credit delivered paid package total through purchased source and keep bonus as metadata.",
    escalation: "Escalate payment route source-of-funds regression immediately.",
  });

  for (const [label, filePath, rewardSource] of [
    ["check-in rewards", "src/app/api/checkin/route.ts", "rewardSource: \"check_in\""],
    ["daily task rewards", "src/lib/server/daily-tasks.ts", "rewardSource: \"task\""],
    ["onboarding rewards", "src/app/api/user/complete-onboarding/route.ts", "rewardSource: \"onboarding\""],
    ["referral rewards", "src/app/api/user/register/route.ts", "referral_bonus"],
    ["admin reward adjustments", "src/app/api/admin/balance/route.ts", "\"reward\""],
  ] as const) {
    requireText(findings, filePath, "creditSourceAwareGumdrops", {
      severity: "major",
      category: "reward_credit",
      title: `${label} must use source-aware reward credit`,
      suggestedFix: `Restore creditSourceAwareGumdrops(..., "reward") in ${filePath}.`,
      escalation: "Reward-source balance regression affects creator paid-only eligibility.",
    });
    requireText(findings, filePath, "\"reward\"", {
      severity: "major",
      category: "reward_credit",
      title: `${label} must credit reward balance`,
      suggestedFix: `Ensure ${filePath} credits the reward source, not purchased source.`,
      escalation: "Reward-source balance regression affects creator paid-only eligibility.",
    });
    requireText(findings, filePath, rewardSource, {
      severity: "moderate",
      category: "transaction_metadata",
      title: `${label} must preserve reward transaction metadata`,
      suggestedFix: `Restore the expected reward source metadata in ${filePath}.`,
      escalation: "Reward metadata feeds admin/audit classification and should be reviewed before changing.",
    });
  }

  for (const expected of [
    "purchasedOnly: true",
    "spendCreatorExperienceGumdrops",
    "spendSourceAwareGumdrops(current, amount, {",
  ]) {
    requireText(findings, "src/lib/server/creator-experiences.ts", expected, {
      severity: "critical",
      category: "creator_paid_spend",
      title: `Creator experience spend policies must remain purchased-only: ${expected}`,
      suggestedFix: "Restore CREATOR_SPEND_POLICIES purchasedOnly and spendCreatorExperienceGumdrops source-aware enforcement.",
      escalation: "Creator monetization cannot spend reward-source GumDrops.",
    });
  }

  for (const filePath of [
    "src/lib/server/chat.ts",
    "src/app/api/creator/subscriptions/route.ts",
    "src/app/api/creator/requests/route.ts",
    "src/app/api/creator/bookings/route.ts",
  ]) {
    requireText(findings, filePath, "spendCreatorExperienceGumdrops", {
      severity: "critical",
      category: "creator_paid_spend",
      title: `${filePath} must route creator spend through purchased-only helper`,
      suggestedFix: "Use spendCreatorExperienceGumdrops so creator monetization cannot draw reward-source balance.",
      escalation: "Escalate creator spend policy regression before release.",
    });
    requireText(findings, filePath, "purchasedAmountSpent", {
      severity: "major",
      category: "transaction_metadata",
      title: `${filePath} must write purchased spend metadata`,
      suggestedFix: "Restore purchasedAmountSpent ledger metadata.",
      escalation: "Source-aware spend metadata is required for audit parity.",
    });
    requireText(findings, filePath, "rewardAmountSpent", {
      severity: "major",
      category: "transaction_metadata",
      title: `${filePath} must write reward spend metadata`,
      suggestedFix: "Restore rewardAmountSpent ledger metadata, expected to remain zero for purchased-only creator spend.",
      escalation: "Source-aware spend metadata is required for audit parity.",
    });
  }

  requireText(findings, "src/app/api/drops/unlock/route.ts", "spendSourceAwareGumdrops(sourceAwareBalance, unlockCost)", {
    severity: "critical",
    category: "normal_drop_spend",
    title: "Normal Drop unlocks must use total source-aware balance",
    suggestedFix: "Restore normal Drop unlock spend without purchasedOnly so total GumDrops can unwrap normal Drops.",
    escalation: "Do not convert normal Drops into creator paid-only spend.",
  });
  forbidText(findings, "src/app/api/drops/unlock/route.ts", "purchasedOnly: true", {
    severity: "critical",
    category: "normal_drop_spend",
    title: "Normal Drop unlock route must not require purchased-only balance",
    suggestedFix: "Remove purchasedOnly from regular Drop unlock spending while preserving creator paid-only rules.",
    escalation: "Escalate because normal Drop affordability rules differ from creator monetization.",
  });

  for (const expected of [
    "credits paid purchase base and bonus GumDrops into purchased source",
    "credits paid purchase packages without bonuses into purchased source only",
    "keeps daily and task rewards in reward source only",
    "lets creator paid-only spend use paid-pack bonus",
    "requires purchased balance for restricted creator spends",
    "gumdropRewardTotal).toBe(0)",
    "gumdropPurchaseBonusTotal).toBe(50)",
  ]) {
    requireText(findings, "tests/unit/gumdrop-ledger.spec.ts", expected, {
      severity: "major",
      category: "test_coverage",
      title: `Ledger source-of-funds tests must cover: ${expected}`,
      suggestedFix: "Add focused ledger unit coverage for paid/reward split and creator paid-only spend.",
      escalation: "Do not rely on manual audits for paid/reward balance truth.",
    });
  }

  for (const expected of [
    "paid-pack bonus GumDrops into paid-source backend balance",
    "gumDropsPurchasedBalance: 550",
    "gumDropsRewardBalance: 0",
    "purchaseSourceClassification: \"paid_purchase_including_bonus\"",
  ]) {
    requireText(findings, "tests/unit/paypal-capture-route.spec.ts", expected, {
      severity: "major",
      category: "test_coverage",
      title: `PayPal capture tests must cover: ${expected}`,
      suggestedFix: "Add route test coverage proving paid package bonuses credit purchased balance.",
      escalation: "Payment route regressions require targeted tests before release.",
    });
  }

  return findings;
}

function statusFor(score: number, criticalCount: number): EconomyReport["status"] {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function buildReport(): EconomyReport {
  const findings = collectFindings();
  const score = Math.max(0, Math.min(100, findings.reduce((current, finding) => current + finding.scoreImpact, 100)));
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  return {
    score,
    status: statusFor(score, criticalCount),
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    findings,
    criticalCount,
    majorCount,
    safeAutofixesAvailable: findings.filter((finding) => finding.canAutofix).length,
    checkedFiles: [...checkedFiles],
    rules,
    summary: findings.length === 0
      ? "GumDrops economy truth is clean: paid package bonuses remain paid-source, rewards remain reward-source, creator spend is purchased-only, and normal Drops use total balance."
      : `GumDrops economy score found ${findings.length} finding(s), ${criticalCount} critical and ${majorCount} major.`,
  };
}

const report = buildReport();
const reportPath = join(root, REPORT_PATH);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`GumDrops economy score: ${report.score}/100 (${report.status})`);
console.log(report.summary);
if (report.findings.length > 0) {
  console.log("Top findings:");
  for (const finding of report.findings.slice(0, 5)) {
    console.log(`- [${finding.severity}] ${finding.title} (${finding.filePath}${finding.line ? `:${finding.line}` : ""})`);
  }
}
console.log("Minimal commands: npm run score:economy, npm run check:gumdrop-economy, targeted ledger/economy unit tests");
console.log("Forbidden default commands: Playwright, Lighthouse, Cypress, full npm run check");
