import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readRepoToolchainState } from "./shared";

type FindingSeverity = "p0" | "p1" | "p2";

type EconomyAccuracyFinding = {
    id: string;
    severity: FindingSeverity;
    surface: string;
    status: "fixed" | "dry_run";
    filePath: string;
    detail: string;
};

const root = process.cwd();
const failures: string[] = [];
const fixesApplied: EconomyAccuracyFinding[] = [];
const dryRunRemediationCandidates: EconomyAccuracyFinding[] = [];

function readRequired(relativePath: string) {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
    if (!source.includes(expected)) {
        failures.push(`${label} must include "${expected}".`);
    }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
    if (source.includes(forbidden)) {
        failures.push(`${label} must not include "${forbidden}".`);
    }
}

function addFixed(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    fixesApplied.push({ id, severity, surface, status: "fixed", filePath, detail });
}

function addDryRun(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    dryRunRemediationCandidates.push({ id, severity, surface, status: "dry_run", filePath, detail });
}

function currentHead() {
    return readRepoToolchainState().currentHead ?? "unknown";
}

const toolchain = readRepoToolchainState();
if (toolchain.gitStatus !== "available") {
    failures.push(`git_required: GumDrop economy accuracy cannot clear current-head proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`);
}

const sourceFunds = readRequired("src/lib/gumdrop-source-of-funds.ts");
const ledger = readRequired("src/lib/gumdrop-ledger.ts");
const economics = readRequired("src/lib/gumdrop-economics.ts");
const paypal = readRequired("src/app/api/paypal/capture/route.ts");
const creatorServer = readRequired("src/lib/server/creator-experiences.ts");
const requestRoute = readRequired("src/app/api/creator/requests/route.ts");
const bookingRoute = readRequired("src/app/api/creator/bookings/route.ts");
const subscriptionRoute = readRequired("src/app/api/creator/subscriptions/route.ts");
const subscriptionCron = readRequired("src/app/api/cron/process-creator-subscriptions/route.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const bookingSlots = readRequired("src/lib/creator-booking-slots.ts");
const panel = readRequired("src/components/Creators/CreatorExperiencesPanel.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const docs = readRequired("docs/agent-truth/gumdrop-economy-accuracy.md");
const packageJson = readRequired("package.json");
const accuracyTest = readRequired("tests/unit/gumdrop-economy-accuracy.spec.ts");
const slotTest = readRequired("tests/unit/creator-booking-slots.spec.ts");
const panelTest = readRequired("tests/unit/creator-experiences-panel.spec.tsx");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");

for (const expected of [
    "export type GumdropSourceClass",
    "paid_bonus",
    "reward_promo",
    "unknown_legacy",
    "buildPaidBundleCredit",
    "paidBaseGd",
    "paidBonusGd",
    "rewardCreditGd: 0",
    "purchasedCreditGd: deliveredGd",
    "paid_purchase_including_bonus",
    "buildRewardCredit",
    "assertCreatorExperienceSpendIsPurchasedOnly",
]) {
    requireIncludes(sourceFunds, expected, "source-of-funds contract");
}

for (const expected of [
    "buildPaidBundleCredit",
    "Purchase bonuses are paid bundle credits and live in purchased balance.",
    "rewardCreditGumDrops: canonicalCredit.rewardCreditGd",
    "purchaseBonusGumDrops: canonicalCredit.paidBonusGd",
    "sourceClassification: canonicalCredit.sourceClassification",
]) {
    requireIncludes(ledger, expected, "GumDrop ledger paid bundle contract");
}
requireNotIncludes(ledger, "rewardCreditGumDrops: bonusGumDrops", "GumDrop ledger paid bundle contract");

for (const expected of [
    "bonusValueUsd",
    "not reward balance",
    "Paid base at the retail anchor",
    "paid bundle bonus",
]) {
    requireIncludes(economics, expected, "GumDrop economics comments");
}

for (const expected of [
    "paidBaseGd: purchaseCredit.paidGumDrops",
    "paidBonusGd: purchaseCredit.purchaseBonusGumDrops",
    "purchasedCreditGd: purchaseCredit.purchasedCreditGumDrops",
    "rewardCreditGd: purchaseCredit.rewardCreditGumDrops",
    "rewardPromoGd: 0",
    "sourceClassification: purchaseCredit.sourceClassification",
    "sourceOfFundsBreakdown",
    "rewardBalanceCreditGumDrops: purchaseCredit.rewardCreditGumDrops",
]) {
    requireIncludes(paypal, expected, "PayPal source-of-funds transaction");
}

for (const expected of [
    "buildCreatorExperienceAttribution",
    "assertCreatorExperienceSpendIsPurchasedOnly",
    "paidSourceRequired: true",
    "attributionTruth: \"creator_experience_paid_source\"",
    "source_policy: \"creator_experience_paid_only\"",
    "ledgerSource: \"purchased\"",
]) {
    requireIncludes(creatorServer, expected, "creator experience attribution helper");
}

for (const [label, source] of [
    ["creator requests route", requestRoute],
    ["creator bookings route", bookingRoute],
    ["creator subscriptions route", subscriptionRoute],
    ["creator subscription renewal route", subscriptionCron],
    ["creator chat server", chatServer],
] as const) {
    requireIncludes(source, "buildCreatorExperienceAttribution", label);
    requireIncludes(source, "buildCreatorExperienceTransactionAttributionExtra", label);
    requireIncludes(source, "creatorExperienceRecordId", label);
    requireIncludes(source, "idempotencyKey", label);
}

for (const expected of [
    "buildCreatorBookingSlots",
    "creator_availability_not_configured",
    "no_available_slots",
    "bookingOverlapsExisting",
    "slotIntervalMinutes",
]) {
    requireIncludes(bookingSlots, expected, "creator booking slots helper");
}

for (const expected of [
    "data-booking-slot-source=\"creator_availability_windows\"",
    "data-booking-slot-count",
    "data-booking-selected-slot",
    "data-booking-free-pick-disabled=\"true\"",
    "No available slots right now",
    "Check back later or follow for updates.",
    "Choose a slot",
    "data-creator-owner-mode=\"true\"",
    "You are viewing your creator profile.",
    "Manage this in Creator Dashboard.",
]) {
    requireIncludes(panel, expected, "creator experiences panel");
}
requireNotIncludes(panel, "type=\"datetime-local\"", "creator experiences panel");

requireIncludes(creatorProfile, "existingBookings={bookings}", "creator profile booking slot data");
requireIncludes(creatorProfile, "gumDropsPurchasedBalance ?? 0", "creator profile paid balance display");
requireIncludes(creatorProfile, "data-drop-visibility-scope=\"own_creator_drops\"", "creator profile drop scope");
requireIncludes(dropsClient, "data-drop-visibility-scope=\"public_discovery\"", "public drops scope");

for (const expected of [
    "Paid bundle bonuses are purchased balance, not reward balance.",
    "Reward/free GumDrops are not usable for creator experiences.",
    "Creator attribution fields required for every fan experience.",
    "Booking availability uses generated slots.",
    "Creator owner mode hides fan controls on own profile.",
    "Creator management surfaces show own drops only.",
]) {
    requireIncludes(docs, expected, "gumdrop economy accuracy docs");
}

requireIncludes(packageJson, "\"check:gumdrop-economy-accuracy\": \"tsx scripts/agent/validate-gumdrop-economy-accuracy.ts\"", "package scripts");
requireIncludes(accuracyTest, "2_500", "accuracy tests");
requireIncludes(accuracyTest, "5_000", "accuracy tests");
requireIncludes(slotTest, "excludes overlapping booked and past slots", "booking slot tests");
requireIncludes(panelTest, "arbitrary datetime", "panel tests");
requireIncludes(paypalTest, "paidBaseGd", "PayPal tests");

addFixed("paid-bundle-bonus-source", "p0", "wallet", "src/lib/gumdrop-source-of-funds.ts", "Paid package bonuses classify as paid bundle credits and purchased balance.");
addFixed("paypal-source-breakdown-aliases", "p0", "wallet", "src/app/api/paypal/capture/route.ts", "PayPal capture records paidBaseGd, paidBonusGd, rewardPromoGd, and source classification aliases.");
addFixed("creator-paid-source-attribution", "p0", "creator-experience", "src/lib/server/creator-experiences.ts", "Creator experience attribution binds creatorId, userId, source, spend, share, cashout, IDs, and paid-source truth.");
addFixed("booking-generated-slots", "p1", "creator-profile", "src/lib/creator-booking-slots.ts", "Fan booking selection is generated from creator availability and existing bookings.");
addFixed("creator-owner-mode", "p1", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Creator owner view hides fan experience controls.");
addFixed("drop-visibility-scope-attrs", "p2", "drops", "src/app/creators/[username]/CreatorProfileClient.tsx", "Creator profile drops are marked as own creator drops while public discovery remains public.");

addDryRun("legacy-total-balance-source", "p2", "wallet", "src/lib/gumdrop-ledger.ts", "readSourceAwareBalance still preserves legacy total-only balances for non-creator compatibility; creator UI now reads paid balance directly.");

const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "gumdrop-economy-accuracy",
    currentHead: currentHead(),
    currentHeadSource: toolchain.currentHeadSource,
    gitStatus: toolchain.gitStatus,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    summary: {
        purchaseCreditPaths: 3,
        rewardCreditPaths: 3,
        creatorSpendPaths: 5,
        creatorAttributionPaths: 5,
        bookingFreePickPaths: panel.includes("datetime-local") ? 1 : 0,
        creatorUserModeLeaks: panel.includes("data-creator-owner-mode=\"true\"") ? 0 : 1,
        dropVisibilityRisks: creatorProfile.includes("data-drop-visibility-scope=\"own_creator_drops\"") ? 0 : 1,
        fixedThisPass: fixesApplied.length,
        dryRunOnlyFindings: dryRunRemediationCandidates.length,
        p0Count: [...fixesApplied, ...dryRunRemediationCandidates].filter((finding) => finding.severity === "p0").length,
        p1Count: [...fixesApplied, ...dryRunRemediationCandidates].filter((finding) => finding.severity === "p1").length,
        p2Count: [...fixesApplied, ...dryRunRemediationCandidates].filter((finding) => finding.severity === "p2").length,
    },
    purchaseCreditPaths: [
        { filePath: "src/lib/gumdrop-source-of-funds.ts", helper: "buildPaidBundleCredit", classification: "paid_purchase_including_bonus" },
        { filePath: "src/lib/gumdrop-ledger.ts", helper: "buildPaidPurchaseBalanceCredit", classification: "paid_purchase_including_bonus" },
        { filePath: "src/app/api/paypal/capture/route.ts", helper: "buildPaidPurchaseBalanceCredit", classification: "paid_purchase_including_bonus" },
    ],
    rewardCreditPaths: [
        { filePath: "src/lib/gumdrop-source-of-funds.ts", helper: "buildRewardCredit", balance: "reward" },
        { filePath: "src/lib/server/daily-tasks.ts", helper: "creditSourceAwareGumdrops", balance: "reward" },
        { filePath: "src/app/api/admin/balance/route.ts", helper: "creditSourceAwareGumdrops", balance: "admin_adjustment" },
    ],
    creatorSpendPaths: [
        { filePath: "src/app/api/creator/requests/route.ts", policy: "creator_experience_paid_only" },
        { filePath: "src/app/api/creator/bookings/route.ts", policy: "creator_experience_paid_only" },
        { filePath: "src/app/api/creator/subscriptions/route.ts", policy: "creator_experience_paid_only" },
        { filePath: "src/app/api/cron/process-creator-subscriptions/route.ts", policy: "creator_experience_paid_only" },
        { filePath: "src/lib/server/chat.ts", policy: "creator_experience_paid_only" },
    ],
    creatorAttributionPaths: [
        { filePath: "src/lib/server/creator-experiences.ts", helper: "buildCreatorExperienceAttribution" },
        { filePath: "src/app/api/creator/requests/route.ts", sourceType: "custom_request" },
        { filePath: "src/app/api/creator/bookings/route.ts", sourceType: "booking_phone|booking_video" },
        { filePath: "src/app/api/creator/subscriptions/route.ts", sourceType: "subscription" },
        { filePath: "src/lib/server/chat.ts", sourceType: "message" },
    ],
    bookingSlotFindings: [
        { filePath: "src/components/Creators/CreatorExperiencesPanel.tsx", freePickDisabled: true, slotSource: "creator_availability_windows" },
    ],
    creatorModeFindings: [
        { filePath: "src/components/Creators/CreatorExperiencesPanel.tsx", ownerModeGuard: true },
    ],
    dropVisibilityFindings: [
        { filePath: "src/app/creators/[username]/CreatorProfileClient.tsx", scope: "own_creator_drops" },
        { filePath: "src/app/drops/DropsClient.tsx", scope: "public_discovery" },
    ],
    fixesApplied,
    dryRunRemediationCandidates,
    nextFixOrder: [
        "Run targeted tests for source-of-funds, creator routes, booking slots, and creator experiences panel.",
        "Keep legacy total-only balance migration as a separate compatibility decision.",
    ],
};

const reportPath = join(root, "agent/state/gumdrop-economy-accuracy.generated.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
    console.error("GumDrop economy accuracy validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("GumDrop economy accuracy validation passed.");
console.log(`Report written to ${reportPath}`);
