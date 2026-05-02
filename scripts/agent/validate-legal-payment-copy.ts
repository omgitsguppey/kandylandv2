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

function requireRegex(source: string, pattern: RegExp, label: string) {
  if (!pattern.test(source)) {
    failures.push(`${label} must match ${pattern}.`);
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
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const economics = readRequired("src/lib/gumdrop-economics.ts");
const packages = readRequired("src/lib/gumdrops-packages.ts");
const insufficientBalance = readRequired("src/components/InsufficientBalanceModal.tsx");
const dropPreview = readRequired("src/components/DropPreviewModal.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const dropCardCta = readRequired("src/components/DropCardCta.tsx");
const onboardingHelpers = readRequired("src/components/Auth/OnboardingHelpers.ts");
const guidedOnboarding = readRequired("src/components/Auth/GuidedOnboarding.tsx");
const notificationPrompt = readRequired("src/components/Dashboard/NotificationPromptBanner.tsx");
const profileNotifications = readRequired("src/app/dashboard/profile/components/ProfileNotificationsSection.tsx");
const profilePrivacy = readRequired("src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx");
const profileSupport = readRequired("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
const faqData = readRequired("src/app/faq/faq-data.ts");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const libraryClient = readRequired("src/app/dashboard/library/LibraryClient.tsx");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
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
requireIncludes(doc, "Purchase UI must separate paid GumDrops from bonus GumDrops", "Legal payment copy doc");
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
for (const expected of ["Support", "New ticket", "Open tickets", "sourcePath"]) {
  requireIncludes(supportInbox, expected, "Support inbox");
}

for (const expected of [
  "deriveGumdropEconomics",
  "FIXED_GUMDROP_PACKAGES",
  "pkgEconomics.paidGumDrops",
  "pkgEconomics.bonusGumDrops",
  "customBundleEconomics.paidGumDrops",
  "customBundleEconomics.bonusGumDrops",
  "paid +",
  "bonus GumDrops",
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
requireRegex(purchaseModal, /bonus\s+GumDrops/i, "Purchase modal visible bonus copy");

for (const expected of [
  "This action costs",
  "You currently have",
  "Shortfall",
]) {
  requireIncludes(insufficientBalance, expected, "Insufficient balance modal");
}
for (const expected of [
  "Unwrap for {unlockCost} GD",
  "Confirm {unlockCost} GD?",
]) {
  requireIncludes(dropPreview, expected, "Drop preview unlock copy");
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
requireIncludes(dropPreview, "formatDropCountdown", "Drop preview countdown");
requireIncludes(libraryClient, "Your unwrapped library", "Library copy");
requireIncludes(viewerClient, "You do not have access to this drop.", "Viewer access copy");

for (const expected of [
  "Turn on alerts",
  "drops go live",
  "daily loop resets",
]) {
  requireIncludes(guidedOnboarding, expected, "Guided onboarding notification copy");
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
  ["src/components/DropPreviewModal.tsx", dropPreview],
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
