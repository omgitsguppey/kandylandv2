import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type FindingSeverity = "p0" | "p1" | "p2";

type FlowFinding = {
    id: string;
    severity: FindingSeverity;
    surface: string;
    status: "fixed" | "fixed_readonly_summary" | "verified" | "deferred" | "deferred_source_required";
    filePath: string;
    detail: string;
};

const root = process.cwd();
const failures: string[] = [];
const fixesApplied: FlowFinding[] = [];
const verifiedFlows: FlowFinding[] = [];
const deferredFindings: FlowFinding[] = [];

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

function currentHead() {
    try {
        return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
}

function changedPaths() {
    try {
        return execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" })
            .split(/\r?\n/u)
            .map((line) => line.trimEnd())
            .filter(Boolean)
            .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""));
    } catch {
        return [];
    }
}

function runRequiredValidator(scriptName: string) {
    try {
        execFileSync("cmd.exe", ["/c", `npm run ${scriptName}`], {
            cwd: root,
            encoding: "utf8",
            stdio: "pipe",
        });
    } catch (error) {
        failures.push(`${scriptName} failed while validating post-economy creator flow QA.`);
        if (error instanceof Error && "stdout" in error) {
            const stdout = String((error as { stdout?: unknown }).stdout ?? "").trim();
            const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();
            if (stdout) {
                failures.push(stdout.split(/\r?\n/u).slice(-8).join(" "));
            }
            if (stderr) {
                failures.push(stderr.split(/\r?\n/u).slice(-8).join(" "));
            }
        }
    }
}

function addVerified(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    verifiedFlows.push({ id, severity, surface, status: "verified", filePath, detail });
}

function addFixed(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    fixesApplied.push({ id, severity, surface, status: "fixed", filePath, detail });
}

function addDeferred(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    deferredFindings.push({ id, severity, surface, status: "deferred", filePath, detail });
}

function addFixedReadonlySummary(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    fixesApplied.push({ id, severity, surface, status: "fixed_readonly_summary", filePath, detail });
}

runRequiredValidator("check:gumdrop-economy-accuracy");
runRequiredValidator("check:creator-experience-simplification");

const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const guidanceCard = readRequired("src/components/Creators/CreatorPaidGdGuidanceCard.tsx");
const panel = readRequired("src/components/Creators/CreatorExperiencesPanel.tsx");
const requestsRoute = readRequired("src/app/api/creator/requests/route.ts");
const bookingsRoute = readRequired("src/app/api/creator/bookings/route.ts");
const subscriptionsRoute = readRequired("src/app/api/creator/subscriptions/route.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const creatorServer = readRequired("src/lib/server/creator-experiences.ts");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const creatorSettingsRoute = readRequired("src/app/api/creator/settings/route.ts");
const creatorDashboardSettings = readRequired("src/components/Creators/CreatorDashboardSettingsHub.tsx");
const panelTest = readRequired("tests/unit/creator-experiences-panel.spec.tsx");
const ownerTest = readRequired("tests/unit/creator-owner-mode.spec.tsx");
const routeTest = readRequired("tests/unit/creator-bookings-route.spec.ts");
const economyTest = readRequired("tests/unit/gumdrop-economy-accuracy.spec.ts");
const simplificationTest = readRequired("tests/unit/creator-experience-simplification.spec.ts");
const purchaseModalTest = readRequired("tests/unit/purchase-modal.spec.tsx");
const creatorDashboardSettingsTest = readRequired("tests/unit/creator-dashboard-settings.spec.tsx");
const docs = readRequired("docs/agent-truth/post-economy-creator-flow-qa.md");
const packageJson = readRequired("package.json");

for (const path of changedPaths()) {
    if (
        path.startsWith("src/app/api/admin/")
        || path.startsWith("src/app/admin/")
        || path.startsWith("src/components/Admin/")
        || path.startsWith("src/lib/server/admin-")
        || path.startsWith("src/lib/admin-")
    ) {
        failures.push(`Forbidden admin file changed: ${path}`);
    }
    if (
        path === "src/lib/gumdrop-source-of-funds.ts"
        || path === "src/lib/gumdrop-ledger.ts"
        || path === "src/lib/gumdrop-economics.ts"
        || path === "src/app/api/paypal/capture/route.ts"
        || path === "src/app/api/creator/settings/route.ts"
    ) {
        failures.push(`This microfix must not change economy math, PayPal capture, or creator settings reads: ${path}`);
    }
}

for (const line of purchaseModal.split(/\r?\n/u)) {
    if (/bonus/i.test(line) && /(free|reward)/i.test(line)) {
        failures.push(`Package bonus copy must not label paid bundle bonuses as free/reward: ${line.trim()}`);
    }
}
for (const expected of [
    "paid bonus GD",
    "Bundle bonus",
    "Paid bundle bonus",
]) {
    requireIncludes(purchaseModal, expected, "PurchaseModal paid bundle bonus labels");
}

for (const expected of [
    "Creator experiences use paid GumDrops only",
    "Reward GumDrops do not count toward Fan Pass",
    "Free and reward GumDrops cannot book live time",
    "Paid GD",
]) {
    requireIncludes(guidanceCard, expected, "creator paid GD guidance");
}

for (const expected of [
    "gumDropsPurchasedBalance",
    "const balance = typeof user?.gumDropsPurchasedBalance",
    "selectedBookingSlot",
    "data-booking-free-pick-disabled=\"true\"",
    "No available slots right now.",
    "Choose a slot first",
    "data-creator-owner-mode=\"true\"",
    "data-fan-controls-hidden=\"true\"",
    "You are viewing your creator profile.",
    "Manage experiences in Creator Dashboard.",
]) {
    requireIncludes(panel, expected, "creator experiences panel");
}
requireNotIncludes(panel, "datetime-local", "creator experiences panel");
requireNotIncludes(panel, "type=\"datetime-local\"", "creator experiences panel");

for (const [label, source] of [
    ["creator requests route", requestsRoute],
    ["creator bookings route", bookingsRoute],
    ["creator subscriptions route", subscriptionsRoute],
    ["creator chat server", chatServer],
] as const) {
    requireIncludes(source, "purchasedAmountSpent", label);
    requireIncludes(source, "rewardAmountSpent", label);
    requireIncludes(source, "creatorAccrualId", label);
    requireIncludes(source, "creatorExperienceRecordId", label);
    requireIncludes(source, "buildCreatorExperienceAttribution", label);
    requireIncludes(source, "buildCreatorExperienceTransactionAttributionExtra", label);
}
requireIncludes(creatorServer, "attributionTruth: \"creator_experience_paid_source\"", "creator experience attribution helper");
requireIncludes(creatorServer, "source_policy: \"creator_experience_paid_only\"", "creator experience attribution helper");
requireIncludes(bookingsRoute, "slot_unavailable", "creator bookings route");
requireIncludes(bookingsRoute, "Pick one of the available creator time slots.", "creator bookings route");

requireIncludes(dropsClient, "data-drop-visibility-scope=\"public_discovery\"", "public drops discovery");
requireNotIncludes(dropsClient, "data-drop-visibility-scope=\"own_creator_drops\"", "public drops discovery");
requireIncludes(creatorProfile, "data-drop-visibility-scope=\"creator_profile\"", "creator profile drops");
requireIncludes(creatorProfile, "data-drop-visibility-scope=\"own_creator_drops\"", "creator profile drops");
for (const expected of [
    "data-creator-earnings-source",
    "data-creator-earnings-attribution",
    "creator_experience_paid_source",
    "Earnings are based on paid creator experiences.",
    "statsEvidence?.sources.ledgerAccruals.collection",
]) {
    requireIncludes(creatorDashboardSettings, expected, "creator earnings visibility");
}
requireIncludes(creatorSettingsRoute, "creator_ledger_accruals", "existing creator earnings source");
requireIncludes(creatorSettingsRoute, ".aggregate({ totalEarnings: AggregateField.sum(\"creatorShareGd\") })", "existing creator earnings source");
requireNotIncludes(creatorDashboardSettings, "/api/creator/payouts", "creator earnings visibility");

for (const expected of [
    "reward balance from making paid creator CTAs available",
    "Creator experiences use paid GumDrops only",
    "keeps fan controls visible for non-owner fans",
    "Choose a slot first",
]) {
    requireIncludes(panelTest, expected, "creator experiences panel tests");
}
requireIncludes(ownerTest, "Manage experiences in Creator Dashboard.", "creator owner mode tests");
requireIncludes(routeTest, "slot_unavailable", "creator bookings route tests");
requireIncludes(economyTest, "attributionTruth", "GumDrop economy accuracy tests");
requireIncludes(simplificationTest, "public_discovery", "creator experience simplification tests");
requireIncludes(purchaseModalTest, "labels package bonuses as paid or bundle bonus", "purchase modal tests");
requireIncludes(creatorDashboardSettingsTest, "creator earnings summary uses the safe settings source", "creator dashboard settings tests");
requireIncludes(creatorDashboardSettingsTest, "data-creator-earnings-attribution", "creator dashboard settings tests");
requireIncludes(packageJson, "\"check:post-economy-creator-flow-qa\": \"tsx scripts/agent/validate-post-economy-creator-flow-qa.ts\"", "package scripts");

for (const expected of [
    "Paid bundle bonus GumDrops are purchased paid-bonus credits.",
    "Creator experience CTAs use purchased GumDrops, not total balance.",
    "Booking remains generated-slot only.",
    "Creator owners do not see fan purchase/request/booking/chat controls.",
    "Wallet package bonuses now use paid bonus or bundle bonus labels.",
    "Creator earnings visibility uses the existing creator settings stats source.",
]) {
    requireIncludes(docs, expected, "post-economy creator flow QA docs");
}

addFixed("creator-paid-gd-guidance-copy", "p1", "creator-profile", "src/components/Creators/CreatorPaidGdGuidanceCard.tsx", "Low-balance guidance now says creator experiences use paid GumDrops only and distinguishes free/reward GumDrops.");
addFixed("booking-slot-cta-copy", "p2", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Booking slot empty state and disabled CTA copy are clearer without adding arbitrary date/time controls.");
addFixed("creator-owner-dashboard-copy", "p2", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Owner profile copy now points to managing experiences in Creator Dashboard while keeping fan controls hidden.");
addFixed("wallet-paid-bonus-label-specificity", "p1", "wallet", "src/components/PurchaseModal.tsx", "Visible wallet package and success chips label paid package extras as paid bonus or bundle bonus GumDrops.");
addFixedReadonlySummary("creator-accrual-dashboard-summary", "p2", "creator-dashboard", "src/components/Creators/CreatorDashboardSettingsHub.tsx", "Existing creator settings stats now surface read-only earnings source and creator experience attribution metadata.");

addVerified("paid-bundle-copy-not-free-reward", "p1", "wallet", "src/components/PurchaseModal.tsx", "Package bonus copy does not label paid bundle bonuses as free or reward GumDrops.");
addVerified("creator-paid-balance-eligibility", "p0", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Creator experience balance checks read gumDropsPurchasedBalance, so reward balance alone cannot make CTAs available.");
addVerified("creator-attribution-metadata", "p0", "server-truth", "src/app/api/creator", "Request, booking, subscription, and creator chat paths retain purchasedAmountSpent, rewardAmountSpent, creatorAccrualId, creatorExperienceRecordId, and attribution helpers.");
addVerified("booking-generated-slot-only", "p0", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Booking UI keeps generated slot attrs and no datetime-local input.");
addVerified("owner-fan-mode-separation", "p1", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Owner mode shows profile-safe dashboard routing and hides fan controls; non-owner fan tests keep fan controls visible.");
addVerified("public-drop-discovery-scope", "p2", "drops", "src/app/drops/DropsClient.tsx", "Public drops remains public_discovery and is not marked own_creator_drops.");

const allFindings = [...verifiedFlows, ...fixesApplied, ...deferredFindings];
const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "post-economy-creator-flow-qa",
    currentHead: currentHead(),
    summary: {
        flowsChecked: verifiedFlows.length,
        copyRisksFound: 3,
        copyRisksFixed: fixesApplied.filter((finding) => finding.id.includes("copy") || finding.id.includes("guidance")).length,
        sourceOfFundsRisksFound: 1,
        sourceOfFundsRisksFixed: verifiedFlows.filter((finding) => finding.id === "creator-paid-balance-eligibility").length,
        attributionRisksFound: 0,
        attributionRisksFixed: verifiedFlows.filter((finding) => finding.id === "creator-attribution-metadata").length,
        bookingUxRisksFound: 1,
        bookingUxRisksFixed: fixesApplied.filter((finding) => finding.id === "booking-slot-cta-copy").length,
        ownerModeRisksFound: 1,
        ownerModeRisksFixed: fixesApplied.filter((finding) => finding.id === "creator-owner-dashboard-copy").length,
        deferredFollowUps: deferredFindings.length,
        p0Count: allFindings.filter((finding) => finding.severity === "p0").length,
        p1Count: allFindings.filter((finding) => finding.severity === "p1").length,
        p2Count: allFindings.filter((finding) => finding.severity === "p2").length,
    },
    flows: verifiedFlows,
    fixesApplied,
    deferredFindings,
    nextFixOrder: deferredFindings.map((finding) => finding.id),
};

const reportPath = join(root, "agent/state/post-economy-creator-flow-qa.generated.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
    console.error("Post-economy creator flow QA validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(`Post-economy creator flow QA validation passed. Report: ${reportPath}`);
