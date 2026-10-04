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

const deviceLayout = readRequired("src/lib/device-layout-contract.ts");
const shell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const chat = readRequired("src/components/Chat/ChatExperience.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const bottomNav = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const mediaLimitClient = readRequired("src/lib/chat/chat-media-limits.ts");
const mediaLimitServer = readRequired("src/lib/server/chat-media-limit-policy.ts");
const prepareRoute = readRequired("src/app/api/chat/attachments/prepare/route.ts");
const completeRoute = readRequired("src/app/api/chat/attachments/complete/route.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const navigationPrimitives = readRequired("src/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives.tsx");
const transcript = readRequired("src/components/creative-tim/kandydrops/chat/ChatTranscriptSurface.tsx");
const newMessageModal = readRequired("src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx");

requireIncludes(deviceLayout, "isIosStandalonePwa", "iOS PWA detection");
requireIncludes(deviceLayout, "isIosUserAgent", "iOS detection");
requireIncludes(chat, "data-chat-shell-platform={isIosPwaChatShell ? \"ios-pwa\"", "iOS PWA chat shell marker");
requireIncludes(shell, "--kd-ios-pwa-visual-height", "iOS PWA chat shell vars");
requireIncludes(shell, "--kd-ios-pwa-bottom-nav-y", "iOS PWA chat shell vars");
requireIncludes(shell, "--kd-ios-pwa-bottom-nav-height", "iOS PWA chat shell vars");
requireIncludes(shell, "--kd-ios-pwa-safe-bottom", "iOS PWA chat shell vars");
requireIncludes(shell, "--kd-ios-pwa-chat-bottom-gap", "iOS PWA chat shell vars");
requireIncludes(shell, "--kd-ios-pwa-shell-lift", "iOS PWA chat shell vars");
requireIncludes(mobileShell, "USER_MOBILE_CHAT_IOS_PWA_BOTTOM_RESERVED_HEIGHT", "iOS PWA shell token");
requireIncludes(bottomNav, "<KandyMobileNavigationDock platformShell={iosPwa ? \"ios-pwa\" : \"default\"}", "iOS PWA dock platform projection");
requireIncludes(navigationPrimitives, "data-platform-shell={platformShell}", "iOS PWA dock platform marker");

requireIncludes(chat, "from \"@/components/creative-tim/kandydrops/chat/ChatTranscriptSurface\"", "Chat transcript presentation import");
requireIncludes(chat, "<ChatTranscriptSurface", "Chat transcript presentation consumer");
requireIncludes(chat, "mediaPreviewStyle={CHAT_MEDIA_PREVIEW_STYLE}", "Chat media preview policy binding");
requireIncludes(chat, "restoreChatBottomAnchor", "Bottom anchor helper");
requireIncludes(chat, "chat_bottom_anchor_restored", "Bottom anchor telemetry");
requireIncludes(transcript, "data-chat-media-density=\"compact-v2\"", "Media compact marker");
requireIncludes(transcript, "data-chat-media-kind=\"image\"", "Media kind marker");
requireIncludes(transcript, "data-chat-media-kind=\"video\"", "Media kind marker");

requireIncludes(mediaLimitClient, "CHAT_MEDIA_LIMIT_BYTES_DEFAULT = 25 * 1024 * 1024", "Client media limits");
requireIncludes(mediaLimitClient, "CHAT_MEDIA_LIMIT_BYTES_FAN_PASS = 500 * 1024 * 1024", "Fan pass media limit");
requireIncludes(mediaLimitServer, "resolveServerChatMediaLimitPolicy", "Server media limit policy");
requireIncludes(prepareRoute, "file_too_large", "Prepare route typed limit error");
requireIncludes(prepareRoute, "file_too_large_requires_fan_pass", "Prepare route fan pass limit error");
requireIncludes(prepareRoute, "fan_pass_file_limit_exceeded", "Prepare route fan pass hard cap error");
requireIncludes(completeRoute, "file_too_large", "Complete route typed limit error");
requireIncludes(completeRoute, "file_too_large_requires_fan_pass", "Complete route fan pass limit error");
requireIncludes(completeRoute, "fan_pass_file_limit_exceeded", "Complete route fan pass hard cap error");

requireIncludes(chatServer, "fanPassActive:", "Chat pricing fan pass truth");
requireIncludes(chatServer, "subscriberFreeChatApplies", "Paid GD gate preserved");
requireNotIncludes(chat, "isAndroidPwaChatShell ? \"ios-pwa\"", "No Android/iOS branch mixing");

requireIncludes(chat, "from \"@/components/creative-tim/kandydrops/chat/ChatNewMessageModal\"", "New message presentation import");
requireIncludes(chat, "<ChatNewMessageModal", "New message presentation consumer");
requireIncludes(chat, "iosPwa={isIosPwaChatShell}", "New message canonical iOS platform binding");
requireIncludes(chat, "sheetStyle={newMessageSheetStyle}", "New message shell spacing binding");
requireIncludes(newMessageModal, "data-new-message-sheet-platform={iosPwa ? \"ios-pwa\" : \"default\"}", "iOS PWA new message sheet marker");
requireIncludes(newMessageModal, "data-new-message-sheet-safe=\"above-bottom-nav\"", "New message sheet bottom-nav-safe marker");
requireIncludes(chat, "Start a creator chat", "Chat list empty state copy");
requireIncludes(chat, "Follow a creator first", "No-follow empty state copy");
requireIncludes(chat, "Say hey to", "Thread empty state copy");
requireIncludes(chat, "buildChatIceBreakers", "Ice breaker helper");
requireIncludes(chat, "chat_icebreaker_inserted", "Ice breaker telemetry");

if (failures.length > 0) {
  console.error("validate-ios-pwa-chat-refinements failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("validate-ios-pwa-chat-refinements passed.");
