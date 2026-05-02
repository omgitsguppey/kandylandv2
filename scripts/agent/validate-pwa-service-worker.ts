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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

const audit = parseJson("agent/state/pwa-service-worker-audit.generated.json");
const manifest = parseJson("public/manifest.json");
const manifestSource = readRequired("public/manifest.json");
const serviceWorker = readRequired("public/firebase-messaging-sw.js");
const firebaseMessaging = readRequired("src/lib/firebase-messaging.ts");
const pwaBridge = readRequired("src/components/PwaRuntimeBridge.tsx");
const notificationBridge = readRequired("src/components/Notifications/NotificationRuntimeBridge.tsx");
const notificationIdentity = readRequired("src/lib/notification-identity.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const functionsQueue = readRequired("functions/src/queue-runtime.ts");
const browserEnrollment = readRequired("src/lib/browser-notification-enrollment.ts");
const userMobileShell = readRequired("src/lib/user-mobile-shell.ts");
const rootLayout = readRequired("src/app/layout.tsx");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const mobileBottomBar = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const notFoundSurface = readRequired("src/components/ui/NotFoundSurface.tsx");
const notFoundRoute = readRequired("src/app/not-found.tsx");
const offlineRoute = readRequired("src/app/offline/page.tsx");
const packageJson = readRequired("package.json");
const swTest = readRequired("tests/unit/firebase-messaging-sw.spec.ts");
const notFoundTest = readRequired("tests/unit/not-found-surface.spec.tsx");
const manifestTest = readRequired("tests/unit/pwa-manifest.spec.ts");
const messagingTest = readRequired("tests/unit/firebase-messaging-registration.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const doc = readRequired("docs/agent-truth/pwa-service-worker-mobile.md");

const lanes = requireArray(audit.lanes, "audit.lanes", 17);
for (const laneKey of [
  "manifest.identity",
  "manifest.colors",
  "manifest.icons",
  "service-worker-registration",
  "service-worker-scope",
  "service-worker-cache-strategy",
  "service-worker-update-invalidation",
  "reload-after-deploy",
  "notification-permission-flow",
  "fcm-foreground-handler",
  "fcm-background-handler",
  "notification-tag-idempotency",
  "notificationclick-return-routing",
  "push-token-refresh",
  "standalone-safe-area",
  "return-to-app-route",
  "pwa-install-prompt",
]) {
  if (!lanes.some((lane) => lane && typeof lane === "object" && (lane as Record<string, unknown>).laneKey === laneKey)) {
    failures.push(`audit.lanes must include ${laneKey}.`);
  }
}

if (manifest.name !== "KandyDrops") {
  failures.push("manifest.name must be KandyDrops.");
}
if (manifest.short_name !== "KandyDrops") {
  failures.push("manifest.short_name must be KandyDrops.");
}
if (manifest.scope !== "/") {
  failures.push("manifest.scope must be /.");
}
if (manifest.display !== "standalone") {
  failures.push("manifest.display must be standalone.");
}
if (manifest.start_url !== "/drops?source=pwa") {
  failures.push("manifest.start_url must be /drops?source=pwa.");
}
if (manifest.theme_color !== "#000000" || manifest.background_color !== "#000000") {
  failures.push("manifest theme/background colors must be #000000.");
}

const icons = requireArray(manifest.icons, "manifest.icons", 2);
for (const iconPath of ["/icon-192x192.png", "/icon-512x512.png"]) {
  if (!icons.some((icon) => icon && typeof icon === "object" && (icon as Record<string, unknown>).src === iconPath)) {
    failures.push(`manifest.icons must include ${iconPath}.`);
  }
  if (!existsSync(join(root, "public", iconPath.replace(/^\//, "")))) {
    failures.push(`Manifest icon file is missing: public${iconPath}.`);
  }
}
for (const oldAsset of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
  requireAbsent(manifestSource + serviceWorker + notFoundSurface, oldAsset, "PWA/404 current asset references");
}

for (const expected of [
  "const APP_SHELL_CACHE",
  "const APP_RUNTIME_CACHE",
  "PRECACHE_URLS",
  "\"/offline\"",
  "\"/manifest.json\"",
  "requestUrl.pathname.startsWith(\"/api/\")",
  "requestUrl.pathname.startsWith(\"/__/\")",
  "handleNavigationRequest(request)",
  "fetch(request)",
  "caches.match(OFFLINE_FALLBACK_URL)",
  "handleStaticRequest(request)",
  "await self.skipWaiting()",
  "await self.clients.claim()",
  "caches.delete(cacheName)",
]) {
  requireIncludes(serviceWorker, expected, "service worker cache/update contract");
}

for (const expected of [
  "resolveSafeNotificationUrl",
  "parsed.origin !== self.location.origin",
  "messaging.onBackgroundMessage",
  "autoDisplayedByFcm",
  "manual display suppressed",
  "resolveNotificationTag(data)",
  "renotify: false",
  "browserDisplayMode: \"manual-service-worker\"",
  "self.addEventListener(\"notificationclick\"",
  "clients.openWindow(targetUrl.toString())",
  "KANDYDROPS_NOTIFICATION_CLICK",
  "postMessage(clickPayload)",
]) {
  requireIncludes(serviceWorker, expected, "service worker notification/return contract");
}

for (const expected of [
  "let appServiceWorkerRegistrationPromise",
  "registerAppServiceWorker",
  "navigator.serviceWorker.register(getAppServiceWorkerUrl(), { scope: \"/\" })",
  "appServiceWorkerRegistrationPromise = null",
  "getToken(messaging",
  "serviceWorkerRegistration: registration",
  "Notification.requestPermission()",
  "resolveBrowserNotificationTag",
  "registration.showNotification(title, notificationOptions)",
  "renotify: false",
  "onMessage(messaging, callback)",
]) {
  requireIncludes(firebaseMessaging, expected, "client Firebase Messaging contract");
}

requireIncludes(pwaBridge, "registerAppServiceWorker", "PWA runtime bridge");
requireIncludes(coreLayout, "<PwaRuntimeBridge />", "Core layout PWA registration owner");
requireIncludes(coreLayout, "shouldEnablePwaRuntime = !isAdminRoute", "Core layout admin PWA bypass");

for (const expected of [
  "onNotificationMessage",
  "alreadyDisplayedByFcm",
  "showBrowserNotification",
  "KANDYDROPS_NOTIFICATION_CLICK",
  "markNotificationsAsRead",
  "notification_opened",
]) {
  requireIncludes(notificationBridge, expected, "foreground notification return loop");
}

for (const expected of [
  "buildNotificationIdempotencyKey",
  "buildBrowserNotificationTag",
  "buildNotificationDocumentId",
]) {
  requireIncludes(notificationIdentity, expected, "notification identity helper");
}
for (const expected of [
  "buildNotificationIdempotencyKey",
  "buildBrowserNotificationTag",
  "dataOnlyPayload",
  "duplicateBrowserDisplayPrevented",
]) {
  requireIncludes(pushNotifications + functionsQueue, expected, "server notification idempotency");
}

for (const expected of [
  "requestBrowserNotificationAccess",
  "browserPushToken",
  "needsStandaloneInstall",
]) {
  requireIncludes(browserEnrollment, expected, "notification permission/token enrollment");
}

for (const expected of [
  "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT",
  "env(safe-area-inset-bottom)",
]) {
  requireIncludes(userMobileShell, expected, "mobile safe-area helper");
}
requireIncludes(rootLayout, "pb-[var(--user-mobile-bottom-nav-reserved-height,0px)]", "root safe-area reservation");
requireIncludes(coreLayout, "--user-mobile-bottom-nav-reserved-height", "Core layout safe-area variable");
requireIncludes(mobileBottomBar, "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET", "MobileBottomBar safe-area offset");

for (const expected of [
  "NOT_FOUND_RETURN_HREF = \"/dashboard\"",
  "Return to App",
  "data-old-not-found-logo-removed",
]) {
  requireIncludes(notFoundSurface, expected, "not-found return behavior");
}
requireIncludes(notFoundRoute, "<NotFoundSurface />", "not-found route");
requireIncludes(offlineRoute, "Browse drops", "offline fallback route");

for (const expected of [
  "data-only manual display safeguards",
  "deterministic browser tags",
  "posts click metadata back to the app",
]) {
  requireIncludes(swTest, expected, "service worker tests");
}
requireIncludes(notFoundTest, "stable app return link", "not-found return test");
requireIncludes(manifestTest, "references current install icons", "manifest/icon smoke test");
requireIncludes(messagingTest, "single-flight service worker registration", "service worker registration test");

for (const expected of [
  "check:pwa-service-worker",
  "scripts/agent/validate-pwa-service-worker.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "service worker",
  "versioned cache names",
  "data-only",
  "Push Token Refresh",
  "Future Agents",
]) {
  requireIncludes(doc, expected, "PWA service worker doctrine");
}

for (const expected of [
  "PWA Service Worker Mobile Install Launch Audit",
  "pwa-service-worker-audit.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "PWA service worker", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "PWA Service Worker Mobile Install", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("PWA service worker validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("PWA service worker validation passed.");
