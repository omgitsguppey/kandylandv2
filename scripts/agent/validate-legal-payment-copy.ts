import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBundlePromoOffer, resolvePurchaseBonusPromoOffer } from "../../src/lib/wallet/purchase-promo-contract";

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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
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

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireAuditCheck(audit: Record<string, unknown>, key: string) {
  const checks = audit.checks && typeof audit.checks === "object"
    ? audit.checks as Record<string, unknown>
    : {};
  const check = checks[key] && typeof checks[key] === "object"
    ? checks[key] as Record<string, unknown>
    : null;
  if (!check) {
    failures.push(`audit.checks must include ${key}.`);
    return;
  }
  if (check.status !== "pass") {
    failures.push(`audit.checks.${key}.status must be "pass".`);
  }
  if (typeof check.evidence !== "string" || check.evidence.trim().length < 12) {
    failures.push(`audit.checks.${key}.evidence must explain the evidence.`);
  }
}

const audit = parseJson("agent/state/legal-payment-copy-audit.generated.json");
const doc = readRequired("docs/agent-truth/legal-payment-user-trust-copy.md");
const packageJson = readRequired("package.json");
const terms = readRequired("src/app/(legal)/terms/page.tsx");
const privacy = readRequired("src/app/(legal)/privacy/page.tsx");
const supportPage = readRequired("src/app/dashboard/support/page.tsx");
const supportInbox = readRequired("src/components/Support/SupportInbox.tsx");
const supportConversation = readRequired("src/components/creative-tim/kandydrops/support/KandySupportConversation.tsx");
const supportCanvas = readRequired("src/components/creative-tim/kandydrops/support/KandySupportConversationCanvas.tsx");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const walletPackagePicker = readRequired("src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx");
const economics = readRequired("src/lib/gumdrop-economics.ts");
const packages = readRequired("src/lib/gumdrops-packages.ts");
const insufficientBalance = readRequired("src/components/InsufficientBalanceModal.tsx");
const dropPreviewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const dropPreviewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const dropCardCta = readRequired("src/components/DropCardCta.tsx");
const onboardingHelpers = readRequired("src/components/Auth/OnboardingHelpers.ts");
const guidedOnboarding = readRequired("src/components/Auth/GuidedOnboarding.tsx");
const guidedOnboardingSurface = readRequired("src/components/creative-tim/kandydrops/onboarding/GuidedOnboardingSurface.tsx");
const notificationPrompt = readRequired("src/components/Dashboard/NotificationPromptBanner.tsx");
const accountPanels = readRequired("src/components/creative-tim/kandydrops/account/AccountSettingsPanels.tsx");
const profileNotifications = accountPanels.slice(accountPanels.indexOf("export function KandyNotificationsPanel"), accountPanels.indexOf("export function KandyPrivacyDataPanel"));
const profilePrivacy = accountPanels.slice(accountPanels.indexOf("export function KandyPrivacyDataPanel"), accountPanels.indexOf("export function KandySupportSafetyPanel"));
const profileSupport = accountPanels.slice(accountPanels.indexOf("export function KandySupportSafetyPanel"));
const faqData = readRequired("src/app/faq/faq-data.ts");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const libraryClient = readRequired("src/app/dashboard/library/LibraryClient.tsx");
const libraryCollectionWall = readRequired("src/components/creative-tim/kandydrops/signed-in/SignedInLibraryCollectionWall.tsx");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const viewerAccessState = readRequired("src/components/creative-tim/kandydrops/viewer/ViewerAccessState.tsx");
const viewerAccess = readRequired("src/lib/drop-view-access.ts");
const notFoundSurface = readRequired("src/components/ui/NotFoundSurface.tsx");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

if (audit.notLegalAdvice !== true) {
  failures.push("audit.notLegalAdvice must be true.");
}
for (const key of [
  "gumDropsAreCurrencyLikeProductUnits",
  "purchaseAmountAndGdAmountClear",
  "paidVsBonusClear",
  "bonusPromoAdminNotCashValue",
  "unlockCostClearBeforeUnlock",
  "expirationCopyConsistentWithLibraryAccess",
  "notificationPermissionCopyExplainsPurpose",
  "termsPrivacyReachable",
  "supportPathReachable",
  "noRealtimeEarningsPromise",
]) {
  requireAuditCheck(audit, key);
}
requireArray(audit.surfaces, "audit.surfaces", 7);
requireArray(audit.warnings, "audit.warnings", 1);
requireIncludes(doc, "This document is not legal advice.", "Legal payment copy doc");
requireIncludes(doc, "Package rows must show total delivered GumDrops, package label, USD price, and a purple bonus chip only.", "Legal payment compact wallet rule");
requireIncludes(doc, "Purchased package bonuses remain paid-source GumDrops", "Legal payment source-of-funds rule");
requireIncludes(doc, "Expiration copy must distinguish public Drop availability from owned library access.", "Legal payment copy doc");
requireIncludes(doc, "npm run check:legal-payment-copy", "Legal payment copy doc");
requireIncludes(packageJson, "\"check:legal-payment-copy\"", "package scripts");

for (const expected of [
  "Virtual Currency",
  "limited, non-transferable, revocable license",
  "Gum Drops are NOT real currency",
  "have no monetary value",
  "redeemed for cash",
  "refunded once purchased",
  "legal@kandydrops.com",
]) {
  requireIncludes(terms, expected, "Terms page");
}

for (const expected of [
  "/dashboard/support",
  "PayPal",
  "Notification data",
  "Commerce data",
  "Privacy Policy",
]) {
  requireIncludes(privacy, expected, "Privacy page");
}
requireIncludes(profilePrivacy, "href=\"/privacy\"", "Profile privacy section");
requireIncludes(profileSupport, "href=\"/dashboard/support\"", "Profile support section");
requireIncludes(supportPage, "SupportInbox", "Support route page");
for (const expected of [
  'from "@/components/creative-tim/kandydrops/support/KandySupportConversation"',
  "<KandySupportConversation",
  "onComposerOpenChange={setComposerOpen}",
  "onCreateThread={() => void handleCreateThread()}",
  "sourcePath: window.location.pathname",
  "threads={threadList?.threads ?? []}",
  "setSelectedThreadId(threadId)",
]) {
  requireIncludes(supportInbox, expected, "Support controller and actual conversation binding");
}
for (const expected of [
  "Start a support thread", "Send request", "onCreateThread();",
  "onClick={() => onComposerOpenChange(!composerOpen)}",
  'aria-label="Support conversations"', "onSelectThread(id);",
  '<KandySupportConversationCanvas', 'from "@/components/creative-tim/kandydrops/support/KandySupportConversationCanvas"',
]) {
  requireIncludes(supportConversation, expected, "Bound Support create and selectable inbox affordances");
}
for (const expected of ["Your conversations", "Switch thread", "{switcher}"]) {
  requireIncludes(supportCanvas, expected, "Bound Support conversation switcher");
}

for (const expected of [
  "deriveGumdropEconomics",
  "FIXED_GUMDROP_PACKAGES",
  "amount={pkg.drops}",
  "pkgEconomics.bonusGumDrops",
  "amount={customDrops}",
  "promo={resolveBundlePromoOffer(customDrops >= 5000)}",
  "<KandyWalletPackageOption",
  "PayPalButtons",
  "selectedPackage.price.toFixed(2)",
  "secured",
]) {
  requireIncludes(purchaseModal, expected, "Purchase modal");
}
for (const expected of [
  "paidGumDrops",
  "bonusGumDrops",
  "bonusValueUsd",
  "effectiveUsdPer100Gd",
]) {
  requireIncludes(economics, expected, "GumDrop economics helper");
}
for (const expected of ["drops", "priceUsd", "label"]) {
  requireIncludes(packages, expected, "GumDrop package catalog");
}
for (const expected of ["GumDrops", "<KandyWalletPromoBadge", "{promo.compactLabel}"]) {
  requireIncludes(walletPackagePicker, expected, "Bound compact wallet delivered amount and bonus display");
}
for (const bonus of [50, 100, 500]) {
  requireIncludes(resolvePurchaseBonusPromoOffer(bonus)?.compactLabel ?? "", "+" + bonus + " bonus GD", "Canonical wallet explicit bonus offer copy");
}
requireIncludes(resolveBundlePromoOffer(true)?.compactLabel ?? "", "2x bonus GD", "Canonical wallet bundle bonus offer copy");
requireIncludes(purchaseModal, "resolvePurchaseBonusPromoOffer(pkgEconomics.bonusGumDrops)", "Wallet bonus offer binding");

for (const expected of [
  "This action costs",
  "You currently have",
  "Shortfall",
]) {
  requireIncludes(insufficientBalance, expected, "Insufficient balance modal");
}
for (const expected of [
  "Unwrap for ${unlockCost.toLocaleString()} GD",
  "Confirm ${unlockCost.toLocaleString()} GD?",
]) {
  requireIncludes(dropPreviewView, expected, "Full-page preview unlock copy");
}
requireIncludes(dropCardLayout, "{drop.unlockCost} GD", "Drop card layout");
requireIncludes(dropCardCta, "Confirm {drop.unlockCost} GD?", "Drop card CTA");

requireIncludes(onboardingHelpers, "leaves the public Drops page", "Onboarding expiration copy");
requireIncludes(onboardingHelpers, "keep it in your library", "Onboarding expiration copy");
requireNotIncludes(onboardingHelpers, "it is gone", "Onboarding expiration copy");
for (const expected of [
  "Expired KandyDrops disappear from the public Drops page if you never unwrapped them.",
  "it stays available in your dashboard library",
  "Do my Gum Drops expire?",
  "support@kandydrops.com",
]) {
  requireIncludes(faqData, expected, "FAQ copy");
}
requireIncludes(dropCardParts, "formatDropCountdown", "Drop card countdown");
requireIncludes(dropPreviewClient, "formatDropCountdown", "Full-page preview countdown owner");
for (const expected of [
  'from "@/components/creative-tim/kandydrops/signed-in/SignedInLibraryCollectionWall"',
  "<SignedInLibraryCollectionWall", "count={unlockedDrops.length}",
  "drops.filter((drop) => unlockedIds.has(drop.id))", "No unwrapped Drops yet",
]) {
  requireIncludes(libraryClient, expected, "Library actual owned collection binding");
}
for (const expected of ["My KandyDrops", "Drops are ready to revisit."]) {
  requireIncludes(libraryCollectionWall, expected, "Bound Library owned-access copy");
}
for (const expected of [
  'from "@/components/creative-tim/kandydrops/viewer/ViewerAccessState"',
  "resolveDropViewAccess({", "const isAuthorized = accessState.allowed;",
]) {
  requireIncludes(viewerClient, expected, "Viewer canonical access and presentation binding");
}
const deniedViewerBranch = viewerClient.slice(viewerClient.indexOf("if (!isAuthorized) {"), viewerClient.indexOf("const viewerStageHeight"));
for (const expected of [
  "<ViewerAccessState", 'title="This Drop is not in your collection"',
  'message="Return to your library or browse Drops to find something new to unwrap."',
  "Browse Drops", "Open library", "Report access issue",
]) {
  requireIncludes(deniedViewerBranch, expected, "Actual denied Viewer copy and recovery");
}
requireIncludes(viewerAccessState, "{title}", "Bound Viewer access heading");
requireIncludes(viewerAccessState, "{message}", "Bound Viewer access explanation");
requireIncludes(viewerAccess, 'return buildState("denied_not_unwrapped", input, "unlock_required");', "Canonical Viewer missing-entitlement state");

for (const expected of [
  'from "@/components/creative-tim/kandydrops/onboarding/GuidedOnboardingSurface"',
  "<GuidedOnboardingSurface", "onEnableNotifications={handleEnableNotifications}",
]) {
  requireIncludes(guidedOnboarding, expected, "Guided onboarding actual notification surface binding");
}
requireIncludes(guidedOnboardingSurface, "onClick={onEnableNotifications}", "Bound onboarding permission action");
for (const expected of [
  "Turn on alerts",
  "drops go live",
  "daily loop resets",
]) {
  requireIncludes(guidedOnboardingSurface, expected, "Bound Guided onboarding notification purpose copy");
}
for (const expected of [
  "Turn on notifications",
  "Drops disappear fast",
]) {
  requireIncludes(notificationPrompt, expected, "Notification prompt banner");
}
for (const expected of [
  "Browser push alerts",
  "Reminders for tasks and drops.",
  "New releases",
  "Ending soon",
]) {
  requireIncludes(profileNotifications, expected, "Profile notification settings");
}

requireIncludes(notFoundSurface, "Return to App", "Not found surface");
requireIncludes(audit.warnings ? JSON.stringify(audit.warnings) : "", "public_404_support_contact", "Audit warnings");

for (const source of [
  ["src/components/PurchaseModal.tsx", purchaseModal],
  ["src/components/InsufficientBalanceModal.tsx", insufficientBalance],
  ["src/components/Drops/LockedDropPreviewView.tsx", dropPreviewView],
  ["src/components/DropCardCta.tsx", dropCardCta],
  ["src/app/faq/faq-data.ts", faqData],
] as const) {
  const [label, content] = source;
  for (const forbidden of ["Tokens", "cash value"]) {
    requireNotIncludes(content, forbidden, label);
  }
}

for (const expected of [
  "Legal Payment User-Trust Copy Audit",
  "legal-payment-copy-audit.generated.json",
  "npm run check:legal-payment-copy",
]) {
  requireIncludes(fullAudit, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "Legal/payment user-trust copy is launch-audited", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Legal Payment User-Trust Copy Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Legal/payment user-trust copy validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Legal/payment user-trust copy validation passed.");
