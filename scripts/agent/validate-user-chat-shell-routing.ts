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

const chat = readRequired("src/components/Chat/ChatExperience.tsx");
const chatShell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const bottomNav = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const spacing = readRequired("src/lib/user-mobile-shell.ts");
const creatorPublicPages = readRequired("src/lib/creator-public-pages.ts");
const creatorDiscoveryRail = readRequired("src/components/CreatorDiscoveryRail.tsx");
const notFound = readRequired("src/components/ui/NotFoundSurface.tsx");
const doc = readRequired("docs/agent-truth/user-chat-shell-routing.md");

for (const needle of [
  "CHAT_VIEWPORT_SHELL_CLASSNAME",
  "CHAT_COMPACT_THREAD_LIST_PANEL_CLASSNAME",
  "CHAT_COMPACT_THREAD_LIST_SCROLL_CLASSNAME",
  "USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "CHAT_LIST_SCROLL_PADDING_BOTTOM",
  "CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET",
  "CHAT_THREAD_COMPOSER_PADDING_BOTTOM",
  "compactThreadListScrollStyle",
  "compactThreadListControlsStyle",
  "compactThreadListFloatingActionStyle",
  "chatThreadComposerStyle",
  "__KANDYDROPS_CHAT_SHELL_ROUTING_DEBUG__",
  "messagesListUsesSharedBottomNavContract",
  "chatThreadUsesSharedBottomNavContract",
  "messagesListScrollContainerFound",
  "messagesListFloatingActionVisible",
  "newThreadControlAboveBottomNav",
  "composerAboveBottomNav",
  "messagesListUsesChatShellSizing",
  "messagesSearchVisible",
  "newThreadControlVisible",
]) {
  requireIncludes(chat, needle, "Messages list shell sizing");
}

for (const needle of [
  "Search",
  "placeholder=\"Search\"",
  "SquarePen",
  "Compose message",
  "No followed creators yet",
]) {
  requireIncludes(chat, needle, "Messages list search/new-thread controls");
}

for (const needle of [
  "documentElement.style.overflow = \"hidden\"",
  "mainElement.style.height = \"100dvh\"",
  "mainElement.style.boxSizing = \"border-box\"",
  "mainElement.style.paddingBottom = \"0px\"",
  "min-h-0",
]) {
  requireIncludes(chatShell, needle, "Chat route shell scroll ownership");
}

for (const needle of [
  "USER_MOBILE_BOTTOM_NAV_HEIGHT",
  "USER_MOBILE_BOTTOM_NAV_SAFE_GAP",
  "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET",
  "CHAT_THREAD_COMPOSER_PADDING_BOTTOM",
]) {
  requireIncludes(spacing, needle, "Shared user mobile shell spacing");
}

requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET", "Bottom nav shared spacing");
requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_HEIGHT", "Bottom nav shared spacing");

requireIncludes(creatorPublicPages, "buildCreatorProfileHref", "Creator profile href builder");
requireIncludes(creatorPublicPages, "/creators/${encodeURIComponent(username)}", "Creator profile href builder");
requireIncludes(chat, "buildCreatorProfileHref", "Chat thread profile route");
requireIncludes(chat, "selectedThreadCreatorProfileHref", "Chat thread profile route");
requireIncludes(chat, "missingProfileHrefReason", "Missing profile href debug metadata");
requireNotIncludes(chat, "href={`/${selectedThread.counterpartUsername}`}", "Chat thread profile route");
requireNotIncludes(chat, "href={`/${", "Chat thread profile route");
requireIncludes(creatorDiscoveryRail, "buildCreatorProfileHref", "Creator discovery profile route");
requireIncludes(creatorDiscoveryRail, "creatorProfileHref", "Creator discovery profile route");
requireIncludes(creatorDiscoveryRail, "Creator profile unavailable", "Creator discovery missing profile route");
requireNotIncludes(creatorDiscoveryRail, "`/creators/${creator.username}`", "Creator discovery profile route");
requireNotIncludes(creatorDiscoveryRail, "href={creator.username ? `/creators/${creator.username}` : \"#\"}", "Creator discovery profile route");
requireNotIncludes(creatorDiscoveryRail, "href=\"#\"", "Creator discovery profile route");

requireIncludes(notFound, "import Link from \"next/link\"", "Not-found return action");
requireIncludes(notFound, "NOT_FOUND_RETURN_HREF = \"/dashboard\"", "Not-found return action");
requireIncludes(notFound, "Return to App", "Not-found return action");
requireIncludes(notFound, "data-old-not-found-logo-removed=\"true\"", "Not-found debug metadata");
requireNotIncludes(notFound, "CandyIcon", "Not-found outdated logo");
requireNotIncludes(notFound, "LegalBackLink", "Not-found broken return helper");
requireNotIncludes(notFound, "router.back", "Not-found return action");
requireNotIncludes(notFound, "Return Home", "Not-found return action");

for (const bannedLayout of ["-mt-", "translate-y-", "bottom-[calc(1.25rem+env", "pb-[calc(1.25rem+env"]) {
  requireNotIncludes(chat, bannedLayout, "Chat bottom-nav overlap fix");
}

for (const bannedSizing of ["paddingBottom: showCompactThreadListOnly", "pb-[calc(1.5rem+env(safe-area-inset-bottom))]", "h-screen", "min-h-screen"]) {
  requireNotIncludes(chat, bannedSizing, "Messages list bounded shell sizing");
}

for (const needle of [
  "Messages list and chat thread views share one mobile shell contract",
  "buildCreatorProfileHref",
  "Return to App",
  "Do not fix bottom-nav overlap with negative margins",
]) {
  requireIncludes(doc, needle, "User chat shell routing doctrine");
}

if (failures.length > 0) {
  console.error("User chat shell/routing validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User chat shell/routing validation passed.");
