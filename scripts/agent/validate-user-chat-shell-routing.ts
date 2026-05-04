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

function countOccurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

function sourceBetween(source: string, startNeedle: string, endNeedles: string[]) {
  const start = source.indexOf(startNeedle);
  if (start === -1) {
    failures.push(`Missing source section: ${startNeedle}.`);
    return "";
  }

  const end = endNeedles
    .map((needle) => source.indexOf(needle, start + startNeedle.length))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0] ?? source.length;

  return source.slice(start, end);
}

function requireOrdered(source: string, firstNeedle: string, secondNeedle: string, label: string) {
  const first = source.indexOf(firstNeedle);
  const second = source.indexOf(secondNeedle);
  if (first === -1 || second === -1 || first > second) {
    failures.push(`${label} must contain "${firstNeedle}" before "${secondNeedle}".`);
  }
}

const chat = readRequired("src/components/Chat/ChatExperience.tsx");
const chatShell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const bottomNav = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const spacing = readRequired("src/lib/user-mobile-shell.ts");
const creatorPublicPages = readRequired("src/lib/creator-public-pages.ts");
const creatorProfileRouting = readRequired("src/lib/creator-profile-routing.ts");
const creatorDiscoveryRail = readRequired("src/components/CreatorDiscoveryRail.tsx");
const notFound = readRequired("src/components/ui/NotFoundSurface.tsx");
const doc = readRequired("docs/agent-truth/user-chat-shell-routing.md");

for (const needle of [
  "CHAT_VIEWPORT_SHELL_CLASSNAME",
  "CHAT_COMPACT_THREAD_LIST_PANEL_CLASSNAME",
  "CHAT_COMPACT_THREAD_LIST_SCROLL_CLASSNAME",
  "USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET",
  "USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "CHAT_LIST_SCROLL_PADDING_BOTTOM",
  "CHAT_LIST_CONTROL_HEIGHT",
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
  "data-chat-shell-mode",
  "data-chat-bottom-nav-reserved=\"true\"",
  "data-chat-composer-above-bottom-nav=\"true\"",
  "data-chat-list-controls-above-bottom-nav=\"true\"",
  "data-chat-density=\"public-beta-compact\"",
  "data-chat-viewport-owner=\"internal\"",
  "data-chat-input-focus-stable=\"true\"",
  "data-chat-composer-chin=\"compact\"",
  "data-chat-top-offset=\"navbar-aligned\"",
  "data-chat-interaction-performance=\"optimized\"",
  "data-chat-diagnostics-deferred=\"true\"",
  "data-chat-tap-path=\"nonblocking\"",
  "paddingBottom: isCompactViewport ? USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET : undefined",
  "chatShellReservesBottomNav: true",
  "chatInnerControlBottomOffset: CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
  "Chat input focus shifted the shell below the navbar.",
  "Chat controls are too close to the bottom navigation.",
  "Chat composer exceeded reserved bottom space.",
  "Chat list scroll container lost viewport ownership.",
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
  "USER_MOBILE_CHAT_VIEWPORT_HEIGHT",
  "mainElement.style.height = USER_MOBILE_CHAT_VIEWPORT_HEIGHT",
  "mainElement.style.boxSizing = \"border-box\"",
  "mainElement.style.paddingBottom = \"0px\"",
  "--chat-visual-viewport-height",
  "min-h-0",
]) {
  requireIncludes(chatShell, needle, "Chat route shell scroll ownership");
}
requireNotIncludes(chatShell, "100vh", "Chat route shell scroll ownership");

for (const needle of [
  "USER_MOBILE_BOTTOM_NAV_HEIGHT",
  "USER_MOBILE_BOTTOM_NAV_SAFE_GAP",
  "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET",
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_TOP_GAP",
  "USER_MOBILE_CHAT_TOP_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT",
  "USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET",
  "USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET",
  "USER_MOBILE_CHAT_CONTROL_GAP",
  "USER_MOBILE_CHAT_VIEWPORT_HEIGHT",
  "USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT",
  "CHAT_LIST_CONTROL_HEIGHT",
  "CHAT_LIST_CONTROLS_BOTTOM_OFFSET = USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
  "CHAT_LIST_SCROLL_PADDING_BOTTOM = `calc(${CHAT_LIST_CONTROLS_BOTTOM_OFFSET} + ${CHAT_LIST_CONTROL_HEIGHT} + ${USER_MOBILE_CHAT_CONTROL_GAP})`",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET",
  "CHAT_THREAD_COMPOSER_PADDING_BOTTOM = USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET",
]) {
  requireIncludes(spacing, needle, "Shared user mobile shell spacing");
}
requireNotIncludes(spacing, "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"", "Shared user mobile shell spacing");
requireIncludes(coreLayout, "const mobileBottomNavReservedHeight = shouldReserveMobileBottomNav", "Chat route shell ownership");
requireIncludes(coreLayout, "data-user-mobile-shell-route={isChatRoute ? \"chat-owned\"", "Chat route shell ownership");
requireIncludes(coreLayout, "\"--root-shell-top-spacing\": USER_MOBILE_CHAT_TOP_RESERVED_HEIGHT", "Chat route shell ownership");
requireIncludes(coreLayout, "\"--user-mobile-chat-bottom-reserved-height\": USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT", "Chat route shell ownership");

requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET", "Bottom nav shared spacing");
requireIncludes(bottomNav, "USER_MOBILE_BOTTOM_NAV_HEIGHT", "Bottom nav shared spacing");

requireIncludes(creatorProfileRouting, "buildCreatorPublicHref", "Creator profile href builder");
requireIncludes(creatorProfileRouting, "/creators/${encodeURIComponent(slug)}", "Creator profile href builder");
requireIncludes(creatorPublicPages, "from \"@/lib/creator-profile-routing\"", "Creator profile href builder re-export");
requireIncludes(chat, "buildCreatorPublicHref", "Chat thread profile route");
requireIncludes(chat, "selectedThreadCreatorProfileHref", "Chat thread profile route");
requireIncludes(chat, "missingProfileHrefReason", "Missing profile href debug metadata");
requireNotIncludes(chat, "href={`/${selectedThread.counterpartUsername}`}", "Chat thread profile route");
requireNotIncludes(chat, "href={`/${", "Chat thread profile route");
requireIncludes(creatorDiscoveryRail, "buildCreatorPublicHref", "Creator discovery profile route");
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

for (const bannedLayout of ["-mt-", "mt-[-", "-mb-", "mb-[-", "translate-y-", "translate-y", "bottom-[calc(1.25rem+env", "pb-[calc(1.25rem+env"]) {
  requireNotIncludes(chat, bannedLayout, "Chat bottom-nav overlap fix");
}

for (const bannedSizing of ["paddingBottom: showCompactThreadListOnly", "pb-[calc(1.5rem+env(safe-area-inset-bottom))]", "h-screen", "min-h-screen"]) {
  requireNotIncludes(chat, bannedSizing, "Messages list bounded shell sizing");
}

for (const needle of [
  "Messages list and chat thread views share one mobile shell contract",
  "The chat route bypasses normal page bottom-nav reservation and owns its own mobile shell spacing",
  "Chat interaction handlers are INP-sensitive",
  "buildCreatorPublicHref",
  "Return to App",
  "Do not fix bottom-nav overlap with negative margins",
]) {
  requireIncludes(doc, needle, "User chat shell routing doctrine");
}

for (const needle of [
  "linear-gradient(135deg,rgba(178,140,255,.96),rgba(126,87,255,.94))",
  "Text ${detail.pricing.textPriceGd} GD, image ${detail.pricing.imagePriceGd} GD, video ${detail.pricing.videoPriceGd} GD. Paid balance ${detail.pricing.purchasedBalanceGd} GD.",
  "chat_thread_opened",
  "chat_compose_sheet_opened",
  "chat_message_send_attempted",
  "chat_message_send_failed",
  "chat_message_sent",
  "chat_list_search_focused",
]) {
  requireIncludes(chat, needle, "Compact chat public beta behavior");
}

for (const needle of [
  "useDeferredValue",
  "visibleThreadById",
  "visibleThreadIdSet",
  "scheduleChatPostPaintTask",
  "scheduleChatPostPaintDiagnostics",
  "scheduleChatLayoutDiagnostics",
  "deferChatDiagnosticReport",
  "deferChatRealtimeIssue",
  "deferChatThreadOpenedTelemetry",
  "deferChatComposeSheetOpenedTelemetry",
  "deferChatListSearchFocusedTelemetry",
  "deferChatMessageSendAttemptedTelemetry",
  "deferChatMessageSendFailedTelemetry",
  "deferChatMessageSentTelemetry",
  "chatInteractionPerformance: \"optimized\"",
  "chatDiagnosticsDeferred: true",
  "chatTapPath: \"nonblocking\"",
]) {
  requireIncludes(chat, needle, "Compact chat interaction performance");
}

const composePickerHandler = sourceBetween(chat, "const openComposePicker = useCallback", ["const handleThreadSearchFocus = useCallback"]);
requireIncludes(composePickerHandler, "setComposePickerOpen(true);", "Compose picker tap path");
requireIncludes(composePickerHandler, "deferChatComposeSheetOpenedTelemetry({", "Compose picker tap path");
requireNotIncludes(composePickerHandler, "trackEvent(\"chat_", "Compose picker tap path");

const searchFocusHandler = sourceBetween(chat, "const handleThreadSearchFocus = useCallback", ["const openThreadFromList = useCallback"]);
requireIncludes(searchFocusHandler, "deferChatListSearchFocusedTelemetry({", "Search focus tap path");
requireNotIncludes(searchFocusHandler, "trackEvent(\"chat_", "Search focus tap path");

const threadOpenHandler = sourceBetween(chat, "const openThreadFromList = useCallback", ["const handleMarkThreadsRead = useCallback"]);
requireOrdered(threadOpenHandler, "setSelectedThreadId(thread.id);", "deferChatThreadOpenedTelemetry({", "Thread open tap path");
requireNotIncludes(threadOpenHandler, "trackEvent(\"chat_", "Thread open tap path");
requireNotIncludes(threadOpenHandler, "reportClientIssue(", "Thread open tap path");
requireNotIncludes(threadOpenHandler, "reportRealtimeIssue(", "Thread open tap path");

const sendMessageHandler = sourceBetween(chat, "const handleSendMessage = useCallback", ["const handleComposerKeyDown = useCallback"]);
requireIncludes(sendMessageHandler, "setSendingMessage(true);", "Message send tap path");
requireIncludes(sendMessageHandler, "deferChatMessageSendAttemptedTelemetry({", "Message send tap path");
requireIncludes(sendMessageHandler, "deferChatMessageSendFailedTelemetry({", "Message send tap path");
requireIncludes(sendMessageHandler, "deferChatMessageSentTelemetry({", "Message send tap path");
requireNotIncludes(sendMessageHandler, "trackEvent(\"chat_", "Message send tap path");

requireNotIncludes(chat, "recoveryGuard.runCheck();", "Compact chat recovery");
requireNotIncludes(chat, "requestAnimationFrame(loop", "Compact chat diagnostics");
requireNotIncludes(chat, "requestAnimationFrame(run", "Compact chat diagnostics");
requireNotIncludes(chat, "while (true)", "Compact chat diagnostics");

const intervalCount = countOccurrences(chat, "setInterval(");
if (intervalCount > 1) {
  failures.push(`Compact chat must not add polling/extra intervals. Found ${intervalCount} setInterval calls.`);
}
requireIncludes(chat, "heartbeatTimer = window.setInterval", "Existing chat presence heartbeat");

if (failures.length > 0) {
  console.error("User chat shell/routing validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User chat shell/routing validation passed.");
