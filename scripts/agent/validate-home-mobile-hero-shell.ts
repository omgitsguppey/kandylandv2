import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const requiredDoctrineNote =
  "The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate.";

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

function requireMatch(source: string, pattern: RegExp, label: string) {
  if (!pattern.test(source)) {
    failures.push(`${label} did not match ${pattern}.`);
  }
}

const hero = readRequired("src/components/Hero.tsx");
const homeHeroActions = readRequired("src/components/Landing/HomeHeroActions.tsx");
const rootLayout = readRequired("src/app/layout.tsx");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const mobileDoctrine = readRequired("docs/agent-truth/mobile-shell-safe-area.md");
const pwaDoctrine = readRequired("docs/agent-truth/pwa-service-worker-mobile.md");
const packageJson = readRequired("package.json");

for (const oldHeroHeight of [
  "min-h-[calc(68vh+3.75rem)]",
  "max-[360px]:min-h-[calc(64vh+3.75rem)]",
]) {
  requireNotIncludes(hero, oldHeroHeight, "Home hero mobile shell height");
}

for (const requiredHeroNeedle of [
  "100dvh",
  "var(--root-shell-top-spacing,6rem)",
  "var(--user-mobile-bottom-nav-reserved-height,0px)",
  "data-home-hero-layout=\"shell-centered\"",
  "data-home-hero-shell-aware=\"true\"",
  "pt-1",
  "pb-3",
]) {
  requireIncludes(hero, requiredHeroNeedle, "Home hero shell-centered layout");
}

requireNotIncludes(hero, "\"use client\"", "Home hero server-rendered contract");
requireNotIncludes(hero, "translate-y", "Home hero centering hack");
requireNotIncludes(hero, "-mt-", "Home hero negative margin hack");
requireNotIncludes(hero, "mt-[-", "Home hero negative margin hack");

const heroSectionMatch = hero.match(/<section[\s\S]*?data-home-hero-layout="shell-centered"[\s\S]*?className="([^"]+)"/);
if (!heroSectionMatch) {
  failures.push("Home hero shell-centered section className could not be located.");
} else {
  const sectionClassName = heroSectionMatch[1];
  for (const forbiddenSectionNeedle of ["absolute", "translate-y", "-mt-", "mt-[-"]) {
    if (sectionClassName.includes(forbiddenSectionNeedle)) {
      failures.push(`Home hero shell-centered section className must not include "${forbiddenSectionNeedle}".`);
    }
  }
}

for (const requiredCtaNeedle of [
  "useAuthLoading",
  "Go to Dashboard",
  "href=\"/dashboard\"",
  "Unwrap Your KandyDrops",
  "openAuthModal(\"signup\")",
  "trackEvent(\"hero_cta_clicked\"",
  "destination: \"/dashboard\"",
  "action: \"open_signup\"",
  "See How It Works",
]) {
  requireIncludes(homeHeroActions, requiredCtaNeedle, "Home hero CTA truth");
}

requireMatch(
  homeHeroActions,
  /loading\s*\?\s*\([\s\S]*?Checking access[\s\S]*?\)\s*:\s*user\s*\?/,
  "Home hero CTA loading guard",
);

for (const shellNeedle of [
  "pb-[var(--user-mobile-bottom-nav-reserved-height,0px)]",
  "\"--user-mobile-bottom-nav-reserved-height\"",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
]) {
  requireIncludes(`${rootLayout}\n${coreLayout}\n${mobileShell}`, shellNeedle, "Shared mobile shell spacing");
}

for (const [label, source] of [
  ["README user manual", readme],
  ["AGENTS AI context", agents],
  ["Repo memory dev truth", repoMemory],
  ["Full audit dev truth", fullAudit],
  ["Mobile shell agent truth", mobileDoctrine],
  ["PWA mobile agent truth", pwaDoctrine],
] as const) {
  requireIncludes(source, requiredDoctrineNote, label);
}

requireIncludes(packageJson, "check:home-mobile-hero-shell", "Package scripts");

if (failures.length > 0) {
  console.error("Home mobile hero shell validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Home mobile hero shell validation passed.");
