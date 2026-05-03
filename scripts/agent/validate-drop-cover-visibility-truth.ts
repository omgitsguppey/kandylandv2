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

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

const helper = readRequired("src/lib/drop-card-visibility.ts");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agentInstructions = readRequired("AGENTS.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const dropsTruth = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const paymentTruth = readRequired("docs/agent-truth/payment-wallet-unlock-entitlement.md");
const visibilityTruth = readRequired("docs/agent-truth/drop-cover-visibility-truth.md");

for (const expected of [
  "resolveDropCardVisibilityState",
  "coverTreatment: DropCoverTreatment",
  "\"clear\"",
  "\"blurred_guest\"",
  "\"blurred_insufficient_balance\"",
  "\"hidden_expired\"",
  "\"owned\"",
  "ctaState: DropCtaState",
  "\"create_profile\"",
  "\"unwrap\"",
  "\"refill\"",
  "\"view\"",
  "\"unavailable\"",
  "canAfford",
  "shortfallGd",
  "reasonCode",
  "gumDropsBalance",
]) {
  requireIncludes(helper, expected, "Drop card visibility helper");
}

for (const expected of [
  "userProfile?.gumDropsBalance",
  "resolveDropCardVisibilityState",
  "getDropCardVisibilityTelemetryPayload",
  "drop_unwrap_intent_blocked_by_funds",
  "drop_unlock_attempted",
  "view_drop_details",
  "unlock_drop_success",
]) {
  requireIncludes(dropCard, expected, "DropCard affordability and telemetry path");
}

for (const expected of [
  "hasProductCoverBlur",
  "imageLoaded ? \"scale-100\" : \"scale-105 blur-md\"",
  "visibilityState.coverTreatment === \"blurred_guest\"",
  "visibilityState.coverTreatment === \"blurred_insufficient_balance\"",
  "\"data-drop-cover-treatment\"",
  "\"data-drop-cta-state\"",
  "\"data-drop-affordability-reason\"",
  "\"data-drop-card-auth-state\"",
]) {
  requireIncludes(dropCardLayout, expected, "DropCard layout explicit cover treatment");
}

for (const expected of [
  "resolveDropCardVisibilityState",
  "resolveFeaturedCoverAccent",
  "data-featured-drop-affordability",
  "data-featured-drop-cta-state",
  "data-featured-chip-treatment=\"cover-aware-glass\"",
  "Create Profile",
  "Refill GumDrops",
  "Unwrap for",
  "View Content",
  "featured_drop_clicked",
]) {
  requireIncludes(featuredCarousel, expected, "Featured carousel visibility and CTA path");
}

for (const banned of [
  "LifetimeProgressBar",
  "progressPercent",
  "w-[104px]",
  "getImageData",
  "createImageBitmap",
]) {
  requireNotIncludes(featuredCarousel, banned, "Featured carousel timer/chip path");
}

for (const banned of [
  "gumDropsPurchasedBalance",
  "gumDropsRewardBalance",
  "spendSourceAwareGumdrops",
  "purchasedAmountSpent",
  "rewardAmountSpent",
]) {
  requireNotIncludes(helper + dropGrid + dropCard + dropCardLayout + featuredCarousel, banned, "Normal drop card/client visibility path");
}

for (const expected of [
  "Drop cover blur is product-state driven, not loading-state driven.",
  "Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop.",
  "Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.",
]) {
  requireIncludes(readme, expected, "User manual doctrine");
  requireIncludes(agentInstructions, expected, "AI system/context doctrine");
  requireIncludes(fullAudit, expected, "Dev truth audit doctrine");
  requireIncludes(repoLedger, expected, "Dev truth memory doctrine");
  requireIncludes(dropsTruth + paymentTruth + visibilityTruth, expected, "Agent-truth drop visibility doctrine");
}

requireIncludes(packageJson, "\"check:drop-cover-visibility-truth\": \"tsx scripts/agent/validate-drop-cover-visibility-truth.ts\"", "package.json");

if (failures.length > 0) {
  console.error("Drop cover visibility truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Drop cover visibility truth validation passed.");
