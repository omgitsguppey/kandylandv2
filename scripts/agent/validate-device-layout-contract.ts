import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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

function walkSourceFiles(startPath: string): string[] {
  const absoluteStart = join(root, startPath);
  if (!existsSync(absoluteStart)) {
    return [];
  }

  const entries = readdirSync(absoluteStart);
  const files: string[] = [];

  for (const entry of entries) {
    const absoluteEntry = join(absoluteStart, entry);
    const stat = statSync(absoluteEntry);

    if (stat.isDirectory()) {
      if ([".next", "node_modules", "out"].includes(entry)) {
        continue;
      }

      files.push(...walkSourceFiles(relative(root, absoluteEntry)));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|css)$/.test(entry)) {
      files.push(relative(root, absoluteEntry).replaceAll("\\", "/"));
    }
  }

  return files;
}

const contract = readRequired("src/lib/device-layout-contract.ts");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const navbar = readRequired("src/components/Navbar.tsx");
const bottomNav = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const scrollToTop = readRequired("src/components/Navigation/ScrollToTop.tsx");
const bugReportTrigger = readRequired("src/components/Feedback/GlobalBugReportTrigger.tsx");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const chatRouteShell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const dropPreviewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const dropPreviewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const lockedPreviewTruth = readRequired("src/lib/locked-drop-preview-truth.ts");
const browserUtils = readRequired("src/lib/browser-utils.ts");
const contractDoc = readRequired("docs/agent-truth/device-layout-contract.md");
const mobileShellDoc = readRequired("docs/agent-truth/mobile-shell-safe-area.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const memoryLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const packageJson = readRequired("package.json");

for (const [id, min, max] of [
  ["xs-phone", "minWidthPx: 0", "maxWidthPx: 359"],
  ["phone", "minWidthPx: 360", "maxWidthPx: 479"],
  ["large-phone", "minWidthPx: 480", "maxWidthPx: 599"],
  ["small-tablet", "minWidthPx: 600", "maxWidthPx: 839"],
  ["tablet", "minWidthPx: 840", "maxWidthPx: 959"],
  ["large-tablet", "minWidthPx: 960", "maxWidthPx: 1279"],
  ["desktop", "minWidthPx: 1280", "maxWidthPx: 1439"],
  ["wide-desktop", "minWidthPx: 1440", "maxWidthPx: 1599"],
  ["ultra-wide", "minWidthPx: 1600", "maxWidthPx: null"],
] as const) {
  requireIncludes(contract, `id: "${id}"`, "Device layout contract breakpoints");
  requireIncludes(contract, min, `Device layout contract ${id} min width`);
  requireIncludes(contract, max, `Device layout contract ${id} max width`);
  requireIncludes(contractDoc, `\`${id}\``, "Device layout doctrine device classes");
}

for (const breakpoint of ["480", "600", "840", "960", "1280", "1440", "1600"]) {
  requireIncludes(contract, breakpoint, "Google/Material breakpoint alignment");
  requireIncludes(contractDoc, breakpoint, "Device layout doctrine breakpoint alignment");
}

for (const displayMode of ["browser", "standalone-pwa", "fullscreen", "unknown"]) {
  requireIncludes(contract, `"${displayMode}"`, "Device display modes");
  requireIncludes(contractDoc, `\`${displayMode}\``, "Device display mode doctrine");
}

for (const sizingNeedle of [
  "minTouchTargetPx: 44",
  "bottomNavVisualHeightPx: 56",
  "min: 12",
  "max: 16",
  "chatInputRowHeightPx",
  "min: 48",
  "max: 52",
  "chatSendButtonPx: 48",
  "chatPlusButtonPx",
  "chatPriceLineMaxPx: 20",
  "floatingButtonPx",
]) {
  requireIncludes(contract, sizingNeedle, "Device sizing constants");
}

for (const doctrineNeedle of [
  "Google owns structural language",
  "Apple owns style/cohesion",
  "KandyDrops agents must use contract tokens and validators",
  "Floating controls must use shared shell tokens",
  "The chat route owns an internal viewport",
  "The full-page locked drop preview keeps bottom nav visible",
]) {
  requireIncludes(contract, doctrineNeedle, "Device layout contract doctrine");
  requireIncludes(contractDoc, doctrineNeedle, "Device layout doctrine");
}

for (const doc of [
  ["README.md", readme],
  ["AGENTS.md", agents],
  ["REPO_MEMORY_LEDGER.md", memoryLedger],
  ["EVERY_FILE_FUNCTION_CHECKLIST.md", checklist],
  ["FULL_SCALE_CODEBASE_AUDIT.md", audit],
] as const) {
  requireIncludes(doc[1], "Google owns structural language", doc[0]);
  requireIncludes(doc[1], "KandyDrops agents must use", doc[0]);
}

requireIncludes(packageJson, "\"check:device-layout-contract\": \"tsx scripts/agent/validate-device-layout-contract.ts\"", "Package script");
requireIncludes(mobileShellDoc, "src/lib/device-layout-contract.ts", "Mobile shell doctrine");
requireIncludes(mobileShellDoc, "USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET", "Mobile shell doctrine floating controls");

for (const token of [
  "USER_MOBILE_BOTTOM_NAV_HEIGHT",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET",
  "USER_MOBILE_CHAT_VIEWPORT_HEIGHT",
  "USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
]) {
  requireIncludes(mobileShell, token, "Shared user mobile shell token compatibility");
}

requireNotIncludes(mobileShell, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"", "Visible chat floating action offset");
requireNotIncludes(mobileShell, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET='0px'", "Visible chat floating action offset");

if (browserUtils.includes("isStandalone") || contract.includes("detectDeviceDisplayMode")) {
  requireIncludes(coreLayout, "detectDeviceDisplayMode", "Core layout display mode support");
  requireIncludes(coreLayout, "data-display-mode={displayMode}", "Core layout display mode debug attribute");
  requireIncludes(coreLayout, "data-device-layout-contract=\"true\"", "Core layout contract marker");
}

requireIncludes(navbar, "data-device-layout-surface=\"top-nav\"", "Top nav debug marker");
requireIncludes(navbar, "data-top-nav-behavior=\"fixed-floating-glass\"", "Top nav behavior marker");
requireIncludes(bottomNav, "data-device-layout-surface=\"mobile-bottom-nav\"", "Mobile bottom nav debug marker");
requireIncludes(bottomNav, "data-bottom-nav-role=\"navigation\"", "Mobile bottom nav role marker");
requireIncludes(bottomNav, "data-bottom-nav-visual-height=\"56\"", "Mobile bottom nav visual height marker");
requireIncludes(coreLayout, "data-user-mobile-shell-route", "Core layout shell route marker");

for (const [file, source] of [
  ["src/components/Feedback/GlobalBugReportTrigger.tsx", bugReportTrigger],
  ["src/components/Navigation/ScrollToTop.tsx", scrollToTop],
] as const) {
  requireIncludes(source, "USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET", `${file} shared floating bottom token`);
  requireIncludes(source, "--user-mobile-floating-control-bottom-offset", `${file} floating bottom CSS variable`);
  requireNotIncludes(source, "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]", `${file} hardcoded mobile bottom offset`);
  requireNotIncludes(source, "bottom-[calc(env(safe-area-inset-bottom)", `${file} hardcoded mobile bottom offset`);
}

for (const [file, source] of [
  ["src/components/CoreLayoutWrapper.tsx", coreLayout],
  ["src/components/Chat/ChatExperience.tsx", chatExperience],
  ["src/components/Chat/ChatRouteShell.tsx", chatRouteShell],
  ["src/components/Drops/LockedDropPreviewView.tsx", dropPreviewView],
  ["src/components/Drops/LockedDropPreviewClient.tsx", dropPreviewClient],
] as const) {
  requireNotIncludes(source, "100vh", `${file} shell-critical viewport unit`);
  requireNotIncludes(source, "-mt-", `${file} negative top margin hack`);
  requireNotIncludes(source, "mt-[-", `${file} negative top margin hack`);
  requireNotIncludes(source, "-mb-", `${file} negative bottom margin hack`);
  requireNotIncludes(source, "mb-[-", `${file} negative bottom margin hack`);
  requireNotIncludes(source, "translate-y-", `${file} translate centering hack`);
}

requireIncludes(chatRouteShell, "USER_MOBILE_CHAT_VIEWPORT_HEIGHT", "Chat route viewport token");
requireIncludes(mobileShell, "100dvh", "Chat route dynamic viewport fallback");
requireIncludes(chatExperience, "data-chat-shell-mode", "Chat shell mode marker");
requireIncludes(chatExperience, "data-chat-viewport-owner=\"internal\"", "Chat internal viewport ownership marker");
requireIncludes(chatExperience, "data-chat-input-focus-stable=\"true\"", "Chat input focus stability marker");
requireIncludes(chatExperience, "data-chat-composer-chin=\"compact\"", "Chat compact composer marker");
requireIncludes(chatExperience, "CHAT_THREAD_COMPOSER_PADDING_BOTTOM", "Chat composer shared padding token");
requireIncludes(chatExperience, "max-h-[18px]", "Chat price line compact max height");
requireIncludes(chatExperience, "h-11 w-11", "Chat plus/list controls meet 44px touch target");
requireIncludes(chatExperience, "h-12 w-12", "Chat send controls meet 48px touch target");
requireIncludes(chatExperience, "min-h-12", "Chat input row meets 48px contract");

requireNotIncludes(bottomNav, "h-10 min-w-0", "Mobile bottom nav touch targets");
requireIncludes(bottomNav, "h-11 min-w-0", "Mobile bottom nav touch targets");
requireIncludes(scrollToTop, "h-11 w-11", "Scroll-to-top floating target");

requireIncludes(dropPreviewView, "data-drop-preview-page=\"true\"", "Drop preview page marker");
requireIncludes(dropPreviewView, "data-safe-preview-fields-only=\"true\"", "Drop preview safe fields marker");
requireIncludes(dropPreviewView, "data-drop-preview-sticky-cta-above-bottom-nav=\"true\"", "Drop preview sticky CTA marker");
requireIncludes(dropPreviewView, "100dvh", "Drop preview dynamic viewport");
requireIncludes(dropPreviewView, "var(--user-mobile-bottom-nav-reserved-height", "Drop preview bottom-nav reservation");
requireIncludes(dropPreviewView, "min-h-12", "Drop preview success CTA touch targets");
requireIncludes(dropPreviewView, "min-h-[3.25rem]", "Drop preview primary CTA touch target");

for (const [file, source] of [
  ["src/components/Drops/LockedDropPreviewView.tsx", dropPreviewView],
  ["src/components/Drops/LockedDropPreviewClient.tsx", dropPreviewClient],
  ["src/lib/locked-drop-preview-truth.ts", lockedPreviewTruth],
] as const) {
  requireNotIncludes(source, "contentUrl", `${file} locked preview internal content leak`);
  requireNotIncludes(source, "contentUrls", `${file} locked preview internal content leak`);
  requireNotIncludes(source, "contentFiles", `${file} locked preview internal content leak`);
  requireNotIncludes(source, "files.map", `${file} locked preview internal thumbnail leak`);
  requireNotIncludes(source, "files?.map", `${file} locked preview internal thumbnail leak`);
}

const sourceFiles = walkSourceFiles("src");
const undocumentedBreakpointPattern =
  /\b(?:const|let|var)\s+[A-Z0-9_]*(?:BREAKPOINT|VIEWPORT_WIDTH|SCREEN_WIDTH)[A-Z0-9_]*\s*=\s*(?:360|480|600|840|960|1280|1440|1600)\b/;

for (const file of sourceFiles) {
  if (file === "src/lib/device-layout-contract.ts") {
    continue;
  }

  const source = readRequired(file);
  if (undocumentedBreakpointPattern.test(source)) {
    failures.push(`${file} defines a breakpoint-like constant outside src/lib/device-layout-contract.ts.`);
  }
}

if (failures.length > 0) {
  console.error("Device layout contract validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Device layout contract validation passed.");
