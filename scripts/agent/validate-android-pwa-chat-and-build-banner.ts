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

const chatRouteShell = readRequired("src/components/Chat/ChatRouteShell.tsx");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const deviceLayout = readRequired("src/lib/device-layout-contract.ts");
const pwaRuntimeBridge = readRequired("src/components/PwaRuntimeBridge.tsx");
const firebaseMessaging = readRequired("src/lib/firebase-messaging.ts");

requireIncludes(deviceLayout, "isAndroidStandalonePwa", "Android PWA detection");
requireIncludes(deviceLayout, "isAndroidUserAgent", "Android PWA detection");
requireIncludes(deviceLayout, "display-mode: standalone", "Android PWA detection");

for (const needle of [
  "--kd-android-pwa-visual-height",
  "--kd-android-pwa-bottom-nav-height",
  "--kd-android-pwa-bottom-safe-padding",
  "data-platform-shell",
  "isAndroidStandalonePwa",
]) {
  requireIncludes(chatRouteShell, needle, "Android PWA chat shell branch");
}

requireIncludes(chatExperience, "data-platform-shell={isAndroidPwaChatShell ? \"android-pwa\" : \"default\"}", "Android PWA chat marker");
requireIncludes(chatExperience, "isAndroidStandalonePwa()", "Android PWA chat detection use");
requireIncludes(chatExperience, "var(--kd-android-pwa-bottom-nav-height", "Android PWA chat bottom spacing");

for (const needle of [
  "USER_MOBILE_CHAT_ANDROID_PWA_VISUAL_HEIGHT",
  "USER_MOBILE_CHAT_ANDROID_PWA_BOTTOM_NAV_HEIGHT",
  "USER_MOBILE_CHAT_ANDROID_PWA_BOTTOM_SAFE_PADDING",
]) {
  requireIncludes(mobileShell, needle, "Android PWA shell tokens");
}

requireNotIncludes(pwaRuntimeBridge, "toast(\"New version available\"", "Visible build refresh banner");
requireNotIncludes(pwaRuntimeBridge, "Refresh to load the latest KandyDrops build.", "Visible build refresh banner");
requireIncludes(pwaRuntimeBridge, "singletonFreshnessWatcherMounted", "Build freshness singleton");
requireIncludes(pwaRuntimeBridge, "cache: \"no-store\"", "Manifest freshness fetch");
requireIncludes(pwaRuntimeBridge, "window.addEventListener(KANDYDROPS_APP_UPDATE_EVENT", "PWA update event handling");

requireIncludes(firebaseMessaging, "KANDYDROPS_APP_UPDATE_EVENT", "PWA update event source");

if (failures.length > 0) {
  console.error("validate-android-pwa-chat-and-build-banner failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("validate-android-pwa-chat-and-build-banner passed.");
