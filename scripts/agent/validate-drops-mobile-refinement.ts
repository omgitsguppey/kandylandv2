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

function requireLineCountAtMost(source: string, maxLines: number, label: string) {
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > maxLines) {
    failures.push(`${label} has ${lineCount} lines; expected <= ${maxLines}.`);
  }
}

const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropsLoading = readRequired("src/app/drops/loading.tsx");
const stickyFilterBar = readRequired("src/components/StickyFilterBar.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCardCta = readRequired("src/components/DropCardCta.tsx");
const dropImpressionHook = readRequired("src/hooks/useDropCardImpression.ts");
const useDrops = readRequired("src/hooks/useDrops.ts");
const uiDoctrine = readRequired("docs/doctrine/kandydrops-ui-doctrine.md");
const agentDoc = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };

for (const [source, label] of [
  [dropCard, "DropCard view"],
  [dropCardLayout, "DropCard layout"],
  [dropCardParts, "DropCard parts"],
  [dropCardCta, "DropCard CTA"],
] as const) {
  requireLineCountAtMost(source, 300, label);
}

for (const needle of [
  "2026 Apple-Aligned Mobile Refinement Rule",
  "https://developer.apple.com/design/human-interface-guidelines/",
  "https://developer.apple.com/design/human-interface-guidelines/layout",
  "https://developer.apple.com/design/human-interface-guidelines/accessibility",
  "Telemetry is required",
]) {
  requireIncludes(uiDoctrine, needle, "KandyDrops UI doctrine");
}

const improvementCount = (agentDoc.match(/^\d+\. /gm) || []).length;
if (improvementCount < 50) {
  failures.push(`Drops mobile refinement doc must list at least 50 improvement areas; found ${improvementCount}.`);
}

for (const needle of [
  "compact_mobile_apple_2026",
  "Firestore runtime subscription until idle",
  "Fake loaded states are forbidden",
  "Do not reintroduce",
]) {
  requireIncludes(agentDoc, needle, "Drops mobile refinement doc");
}

for (const needle of [
  "useDeferredValue",
  "DROPS_MOBILE_UI_DENSITY",
  "drops_page_viewed",
  "initial_visible_drop_count",
  "drops_category_selected",
  "drops_searched",
  "result_count",
  "data-drops-page-density=\"compact-mobile\"",
] ) {
  requireIncludes(dropsClient, needle, "Drops client compact telemetry path");
}

for (const banned of [
  "min-h-[500px]",
  "pb-[calc(7.75rem+env(safe-area-inset-bottom))]",
  "pt-[calc(var(--kandy-cookie-offset,0px)+3.5rem)]",
] ) {
  requireNotIncludes(dropsClient, banned, "Drops client compact layout");
}

for (const needle of [
  "type=\"search\"",
  "enterKeyHint=\"search\"",
  "LayoutGrid",
  "data-drops-filter-bar=\"compact\"",
]) {
  requireIncludes(stickyFilterBar, needle, "Sticky filter bar");
}

for (const banned of [
  "framer-motion",
  "AnimatePresence",
  "window.addEventListener(\"scroll\"",
]) {
  requireNotIncludes(stickyFilterBar, banned, "Sticky filter bar");
}

for (const needle of [
  "usePrefersReducedMotion",
  "useNow",
  "compact_featured_carousel",
  "featured_rank",
  "ui_density",
  "[aspect-ratio:16/10]",
  "DROPS_MOBILE_UI_DENSITY",
]) {
  requireIncludes(featuredCarousel, needle, "Featured carousel compact path");
}

for (const banned of [
  "ActivityTicker",
  "animate-pulse",
  "max-w-[348px]\"",
]) {
  if (banned === "max-w-[348px]\"" && featuredCarousel.includes("[aspect-ratio:16/10]")) {
    continue;
  }
  requireNotIncludes(featuredCarousel, banned, "Featured carousel compact path");
}

for (const needle of [
  "data-drops-grid-density=\"compact-mobile\"",
  "Browse Experiences",
  "href=\"/experiences\"",
  "h-[190px]",
]) {
  requireIncludes(dropGrid, needle, "Drop grid compact path");
}

for (const banned of [
  "Notify Me",
  "toast.success(\"Notify preference saved!",
  "py-16 md:py-24",
  "pb-20",
  "text-6xl",
]) {
  requireNotIncludes(dropGrid, banned, "Drop grid fake/oversized path");
}

for (const needle of [
  "useDropCardImpression",
  "drop_unlock_attempted",
  "drop_unwrap_intent_blocked_by_funds",
  "view_drop_details",
  "unlock_drop_success",
  "source_component: \"compact_drop_card\"",
  "ui_density: DROPS_MOBILE_UI_DENSITY",
]) {
  requireIncludes(dropCard, needle, "DropCard telemetry path");
}

for (const needle of [
  "data-drop-card-density=\"compact-mobile\"",
  "rounded-[1.15rem]",
  "rounded-[0.9rem]",
  "KD",
]) {
  requireIncludes(dropCardLayout, needle, "DropCard compact layout");
}

for (const needle of [
  "useNow",
  "formatTimer",
  "Always available",
]) {
  requireIncludes(dropCardParts, needle, "DropCard shared timer");
}

requireNotIncludes(dropCardParts, "setInterval", "DropCard shared timer");
requireIncludes(dropImpressionHook, "drop_card_impression", "DropCard impression hook");
requireIncludes(dropImpressionHook, "card_aspect_ratio", "DropCard impression hook");
requireIncludes(dropImpressionHook, "ui_density: DROPS_MOBILE_UI_DENSITY", "DropCard impression hook");

for (const needle of [
  "useDeferredClientReady",
  "runtimeSubscriptionReady",
  "idle: true",
  "initialData.length > 0",
]) {
  requireIncludes(useDrops, needle, "Drops hydration hook");
}

for (const needle of [
  "pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)]",
  "h-44",
  "rounded-[1.35rem]",
]) {
  requireIncludes(dropsLoading, needle, "Drops loading shell");
}

if (packageJson.scripts?.["check:drops-mobile-refinement"] !== "tsx scripts/agent/validate-drops-mobile-refinement.ts") {
  failures.push("package.json must expose check:drops-mobile-refinement.");
}

if (failures.length > 0) {
  console.error("Drops mobile refinement validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Drops mobile refinement validation passed.");
