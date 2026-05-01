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

const audit = readRequired("agent/state/mobile-layout-safe-area-audit.generated.json");
const doctrine = readRequired("docs/agent-truth/mobile-shell-safe-area.md");
const rootLayout = readRequired("src/app/layout.tsx");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const bottomNav = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const chatShell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const chat = readRequired("src/components/Chat/ChatExperience.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const experiencesClient = readRequired("src/app/experiences/ExperiencesClient.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const profilePage = readRequired("src/app/dashboard/profile/page.tsx");
const homePage = readRequired("src/app/page.tsx");
const faqPage = readRequired("src/app/faq/page.tsx");
const notFound = readRequired("src/components/ui/NotFoundSurface.tsx");
const adminSpacing = readRequired("src/lib/admin-shell-spacing.ts");
const packageJson = readRequired("package.json");

for (const stateKey of [
  "\"dashboard\"",
  "\"drops\"",
  "\"drop-detail-preview\"",
  "\"wallet\"",
  "\"chat-messages-list\"",
  "\"chat-thread\"",
  "\"experiences\"",
  "\"creator-profile\"",
  "\"auth-onboarding\"",
  "\"notifications\"",
  "\"not-found-404\"",
  "\"admin-overview-analytics-debug\"",
]) {
  requireIncludes(audit, stateKey, "Mobile safe-area audit");
}

for (const doctrineNeedle of [
  "Mobile bottom navigation space is reserved once by the shared app shell",
  "Fixed overlays own their own safe-area padding",
  "Do not use negative margins",
  "Dashboard, Drops, Experiences, Creator Profile, 404",
  "Run `npm run check:mobile-shell-safe-area`",
]) {
  requireIncludes(doctrine, doctrineNeedle, "Mobile shell safe-area doctrine");
}

for (const token of [
  "USER_MOBILE_BOTTOM_NAV_HEIGHT",
  "USER_MOBILE_BOTTOM_NAV_SAFE_GAP",
  "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT",
  "CHAT_LIST_SCROLL_PADDING_BOTTOM",
  "CHAT_THREAD_COMPOSER_PADDING_BOTTOM",
]) {
  requireIncludes(mobileShell, token, "Shared mobile shell tokens");
}

requireIncludes(rootLayout, "pb-[var(--user-mobile-bottom-nav-reserved-height,0px)]", "Root layout mobile bottom reservation");
requireNotIncludes(rootLayout, "pb-32 md:pb-0", "Root layout hardcoded bottom reservation");
requireIncludes(coreLayout, "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT", "Core layout bottom-nav reservation");
requireIncludes(coreLayout, "shouldReserveMobileBottomNav", "Core layout bottom-nav reservation");
requireIncludes(coreLayout, "\"--user-mobile-bottom-nav-reserved-height\"", "Core layout bottom-nav CSS variable");
requireIncludes(coreLayout, "data-user-mobile-shell-route", "Core layout shell debug attribute");
requireIncludes(coreLayout, "isChatRoute", "Core layout chat bypass");
requireIncludes(coreLayout, "isLegalRoute", "Core layout legal bypass");
requireIncludes(coreLayout, "ADMIN_SHELL_ROUTE_CLASS", "Core layout admin bypass");
requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET", "Bottom nav uses shared bottom offset");
requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_HEIGHT", "Bottom nav uses shared height");

for (const [file, source] of [
  ["src/app/page.tsx", homePage],
  ["src/app/experiences/ExperiencesClient.tsx", experiencesClient],
  ["src/app/faq/page.tsx", faqPage],
  ["src/app/dashboard/profile/page.tsx", profilePage],
  ["src/app/creators/[username]/CreatorProfileClient.tsx", creatorProfile],
  ["src/app/drops/DropsClient.tsx", dropsClient],
] as const) {
  requireNotIncludes(source, "pb-[calc(7.75rem+env(safe-area-inset-bottom))]", `${file} duplicate full bottom reservation`);
  requireNotIncludes(source, "pb-32", `${file} duplicate hardcoded bottom reservation`);
}

for (const [file, source] of [
  ["src/components/Chat/ChatExperience.tsx", chat],
  ["src/components/Chat/ChatRouteShell.tsx", chatShell],
  ["src/components/Navigation/MobileBottomBar.tsx", bottomNav],
  ["src/app/drops/DropsClient.tsx", dropsClient],
  ["src/app/experiences/ExperiencesClient.tsx", experiencesClient],
  ["src/app/creators/[username]/CreatorProfileClient.tsx", creatorProfile],
] as const) {
  requireNotIncludes(source, "-mt-", `${file} negative margin bottom-nav fix`);
  requireNotIncludes(source, "mt-[-", `${file} negative margin bottom-nav fix`);
}

requireIncludes(chatShell, "mainElement.style.height = \"100dvh\"", "Chat route bounded viewport");
requireIncludes(chatShell, "mainElement.style.paddingBottom = \"0px\"", "Chat route bypasses root bottom reservation");
requireIncludes(chat, "CHAT_LIST_SCROLL_PADDING_BOTTOM", "Chat messages scroll padding");
requireIncludes(chat, "CHAT_THREAD_COMPOSER_PADDING_BOTTOM", "Chat composer bottom padding");
requireIncludes(dropsClient, "data-drops-page-density=\"compact-mobile\"", "Drops compact mobile contract");
requireIncludes(adminSpacing, "duplicateSafeAreaPaddingDetected: false", "Admin shell safe-area debug metadata");
requireIncludes(notFound, "NOT_FOUND_RETURN_HREF = \"/dashboard\"", "404 return target");
requireIncludes(notFound, "Return to App", "404 return button copy");
requireIncludes(packageJson, "check:mobile-shell-safe-area", "Package scripts");

if (failures.length > 0) {
  console.error("Mobile shell safe-area validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mobile shell safe-area validation passed.");
