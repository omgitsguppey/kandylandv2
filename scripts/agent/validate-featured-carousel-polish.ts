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

const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const titleMarquee = readRequired("src/components/ui/TitleMarquee.tsx");
const globalsCss = readRequired("src/app/globals.css");
const ownedDropGalleryCard = readRequired("src/components/Dashboard/OwnedDropGalleryCard.tsx");
const liveDropsForYouCarousel = readRequired("src/components/Dashboard/LiveDropsForYouCarousel.tsx");
const homeDropTicker = readRequired("src/components/HomeDropTicker.tsx");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agentInstructions = readRequired("AGENTS.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const dropsTruth = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const visibilityTruth = readRequired("docs/agent-truth/drop-cover-visibility-truth.md");
const designTruth = readRequired("docs/agent-truth/design-system-drift.md");

for (const expected of [
  "resolveFeaturedCoverAccent",
  "FEATURED_COVER_ACCENTS",
  "ctaGradientClass",
  "chipGlassClass",
  "data-featured-cta-accent",
  "data-featured-cta-cover-aware=\"true\"",
  "data-featured-chip-treatment=\"cover-aware-glass\"",
  "featured_cta_accent",
]) {
  requireIncludes(featuredCarousel, expected, "Featured carousel cover-aware accent path");
}

for (const expected of [
  "function TimerWithProgress",
  "w-auto max-w-[92px]",
]) {
  requireIncludes(featuredCarousel, expected, "Featured carousel compact timer pill");
}
for (const banned of [
  "LifetimeProgressBar",
  "w-[104px]",
]) {
  requireNotIncludes(featuredCarousel, banned, "Featured carousel timer visual clutter");
}

for (const expected of [
  "getFeaturedSocialProof",
  "totalUnwraps > 10",
  "getDropViewCount",
  "data-featured-social-proof-type",
  "featured_social_proof_type",
]) {
  requireIncludes(featuredCarousel, expected, "Featured carousel social proof fallback");
}

requireNotIncludes(
  featuredCarousel,
  "border border-brand-purple bg-gradient-to-r from-brand-purple to-purple-500 px-3 py-2",
  "Featured carousel CTA must not be a single static brand gradient",
);

for (const expected of [
  "getDropViewCount(drop)",
  "DropCardViewCount",
]) {
  requireIncludes(dropCard + dropCardLayout, expected, "Drop grid card view count path");
}
requireNotIncludes(dropGrid, "getDropViewCount", "Drop grid must not receive a new view-count branch");

for (const expected of [
  "--title-marquee-duration: 11.67s",
  "animation: title-marquee-anim var(--title-marquee-duration)",
  "@media (prefers-reduced-motion: reduce)",
  ".title-marquee-active",
]) {
  requireIncludes(globalsCss, expected, "Global title marquee CSS");
}

for (const expected of [
  "delaySeed * 0.75",
  "ResizeObserver",
  "requestAnimationFrame",
  "data-title-marquee-speed=\"public-beta-fast\"",
]) {
  requireIncludes(titleMarquee, expected, "TitleMarquee fast shared behavior");
}
requireNotIncludes(titleMarquee, "setInterval", "TitleMarquee must not use JS animation loops");

for (const expected of [
  "TitleMarquee",
  "title={drop.title}",
]) {
  requireIncludes(dropCardLayout + featuredCarousel + ownedDropGalleryCard + liveDropsForYouCarousel + homeDropTicker, expected, "Public truncated Drop title surfaces");
}

requireNotIncludes(dropCardParts, "Film", "DropCardParts video count visual");
requireIncludes(dropCardParts, "🎥", "DropCardParts video count visual");
requireIncludes(dropCardParts, "aria-label={fileCountLabel}", "DropCardParts accessible file count label");
requireIncludes(featuredCarousel, "🎥", "Featured carousel video count visual");

for (const banned of [
  "getImageData",
  "createImageBitmap",
  "OffscreenCanvas",
  "canvas.getContext",
]) {
  requireNotIncludes(featuredCarousel + dropCardParts + titleMarquee, banned, "Featured polish must not sample image pixels");
}
for (const banned of [
  "ResizeObserver",
  "MutationObserver",
]) {
  requireNotIncludes(featuredCarousel + dropCardParts, banned, "Featured carousel polish must not add observers");
}

for (const expected of [
  "Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling.",
  "Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views.",
  "Drop grid view counts remain unchanged.",
  "All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected.",
  "Video file chips use a 🎥 camera indicator for clarity.",
]) {
  requireIncludes(readme, expected, "User manual doctrine");
  requireIncludes(agentInstructions, expected, "AI system/context doctrine");
  requireIncludes(fullAudit, expected, "Dev truth audit doctrine");
  requireIncludes(repoLedger, expected, "Dev truth memory doctrine");
  requireIncludes(dropsTruth + visibilityTruth + designTruth, expected, "Agent-truth featured polish doctrine");
}

requireIncludes(packageJson, "\"check:featured-carousel-polish\": \"tsx scripts/agent/validate-featured-carousel-polish.ts\"", "package.json");

if (failures.length > 0) {
  console.error("Featured carousel polish validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Featured carousel polish validation passed.");
