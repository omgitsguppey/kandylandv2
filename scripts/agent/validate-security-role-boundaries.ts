import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function walkFiles(relativeDir: string, predicate: (filePath: string) => boolean) {
  const startDir = path.join(root, relativeDir);
  const results: string[] = [];
  if (!existsSync(startDir)) {
    failures.push(`Missing directory: ${relativeDir}`);
    return results;
  }

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (predicate(absolutePath)) {
        results.push(path.relative(root, absolutePath).replace(/\\/g, "/"));
      }
    }
  };

  visit(startDir);
  return results.sort();
}

function requireIncludes(file: string, content: string, token: string) {
  if (!content.includes(token)) {
    failures.push(`${file} is missing required token: ${token}`);
  }
}

function hasAdminGuard(content: string) {
  return /auth:\s*["']admin["']/u.test(content) || /verifyAdmin\s*\(/u.test(content);
}

function hasUserGuard(content: string) {
  return /auth:\s*["']user["']/u.test(content) || /verifyAuth\s*\(/u.test(content);
}

function hasTrustedOriginGuard(content: string) {
  return /requireTrustedOrigin:\s*true/u.test(content);
}

function routeMethods(content: string) {
  const methodNames = new Set<string>();
  const functionPattern = /(?:export\s+)?(?:async\s+function|function)\s+((GET|POST|PUT|PATCH|DELETE)(?:_handler)?)/gu;
  const exportLetPattern = /export\s+let\s+(GET|POST|PUT|PATCH|DELETE)\b/gu;

  for (const match of content.matchAll(functionPattern)) {
    if (match[2]) {
      methodNames.add(match[2]);
    }
  }
  for (const match of content.matchAll(exportLetPattern)) {
    if (match[1]) {
      methodNames.add(match[1]);
    }
  }

  return [...methodNames].sort();
}

function isStateChanging(methods: string[]) {
  return methods.some((method) => ["POST", "PUT", "PATCH", "DELETE"].includes(method));
}

const apiRouteFiles = walkFiles("src/app/api", (filePath) => path.basename(filePath) === "route.ts");
const adminApiRouteFiles = apiRouteFiles.filter((filePath) => filePath.startsWith("src/app/api/admin/"));

for (const filePath of adminApiRouteFiles) {
  const content = readRequired(filePath);
  const methods = routeMethods(content);
  if (!hasAdminGuard(content)) {
    failures.push(`Admin API route lacks explicit admin guard: ${filePath}`);
  }
  if (isStateChanging(methods) && !hasTrustedOriginGuard(content)) {
    failures.push(`State-changing admin route lacks requireTrustedOrigin: true: ${filePath}`);
  }
}

for (const filePath of [
  "src/app/api/admin/analytics/route.ts",
  "src/app/api/admin/analytics/realtime/route.ts",
  "src/app/api/admin/analytics/historical/route.ts",
  "src/app/api/admin/analytics/refresh/route.ts",
  "src/app/api/admin/debug/route.ts",
]) {
  const content = readRequired(filePath);
  if (!hasAdminGuard(content)) {
    failures.push(`Admin analytics/debug route is public-readable or lacks admin guard: ${filePath}`);
  }
}

const adminLayout = readRequired("src/app/admin/layout.tsx");
requireIncludes("src/app/admin/layout.tsx", adminLayout, "userProfile?.role === \"admin\"");
requireIncludes("src/app/admin/layout.tsx", adminLayout, "router.replace");

const storageRules = readRequired("storage.rules");
requireIncludes("storage.rules", storageRules, "match /drops/{allPaths=**}");
requireIncludes("storage.rules", storageRules, "allow get: if false;");
requireIncludes("storage.rules", storageRules, "allow write: if false;");
if (/match\s+\/drops\/\{allPaths=\*\*\}[\s\S]*allow\s+get:\s+if\s+isSignedIn\s*\(\s*\)/u.test(storageRules)) {
  failures.push("storage.rules allows signed-in users to directly read drops/** assets.");
}
if (/match\s+\/drops\/\{allPaths=\*\*\}[\s\S]*allow\s+write:\s+if\s+isSignedIn\s*\(\s*\)/u.test(storageRules)) {
  failures.push("storage.rules allows signed-in users to directly write drops/** assets.");
}

const firestoreRules = readRequired("firestore.rules");
for (const token of [
  "match /drops/{dropId}",
  "allow read: if isAdmin();",
  "match /transactions/{transactionId}",
  "isSelf(resource.data.userId) || isAdmin()",
  "match /notifications/{notificationId}",
  "allow read: if isSelf(resource.data.userId);",
  "match /creator_message_threads/{threadId}",
  "request.auth.uid == resource.data.creatorId || request.auth.uid == resource.data.userId",
  "allow write: if false;",
]) {
  requireIncludes("firestore.rules", firestoreRules, token);
}

const databaseRules = readRequired("database.rules.json");
for (const token of [
  "\"chat_presence\"",
  "auth.uid === $creatorId || auth.uid === $userId",
  "auth.uid === $uid",
]) {
  requireIncludes("database.rules.json", databaseRules, token);
}

const paypalCreate = readRequired("src/app/api/paypal/create/route.ts");
requireIncludes("src/app/api/paypal/create/route.ts", paypalCreate, "auth: \"user\"");
requireIncludes("src/app/api/paypal/create/route.ts", paypalCreate, "requireTrustedOrigin: true");
requireIncludes("src/app/api/paypal/create/route.ts", paypalCreate, "resolveExpectedGumdropPrice");
requireIncludes("src/app/api/paypal/create/route.ts", paypalCreate, "createPayPalOrder");

const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
for (const token of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "capturePayPalOrder",
  "custom_id",
  "paymentLocks",
  "runTransaction",
  "buildSourceAwareBalancePatch",
]) {
  requireIncludes("src/app/api/paypal/capture/route.ts", paypalCapture, token);
}

const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
for (const token of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "runTransaction",
  "readSourceAwareBalance",
  "spendSourceAwareGumdrops",
  "FieldValue.arrayUnion(dropId)",
]) {
  requireIncludes("src/app/api/drops/unlock/route.ts", unlockRoute, token);
}
if (/expectedBalance|clientBalance|gumDropsBalance\s*:/u.test(unlockRoute)) {
  failures.push("Unlock route appears to accept client-provided balance authority.");
}

const contentRoute = readRequired("src/app/api/drops/content/route.ts");
for (const token of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "userData.unlockedContent.includes(dropId)",
  "creatorId === caller.uid",
  "Cache-Control\", \"private, no-store",
]) {
  requireIncludes("src/app/api/drops/content/route.ts", contentRoute, token);
}

const adminContentRoute = readRequired("src/app/api/admin/content/route.ts");
for (const token of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
]) {
  requireIncludes("src/app/api/admin/content/route.ts", adminContentRoute, token);
}
if (!adminContentRoute.includes("adminStorage.bucket().file(fullPath)") && !adminContentRoute.includes("bucket.file(fullPath)")) {
  failures.push("src/app/api/admin/content/route.ts is missing required token: bucket.file(fullPath)");
}

const creatorAssetRoute = readRequired("src/app/api/creator/drops/assets/route.ts");
for (const token of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "isCreatorRole",
  "drops/creator-submissions",
  "adminStorage.bucket().file(fullPath)",
]) {
  requireIncludes("src/app/api/creator/drops/assets/route.ts", creatorAssetRoute, token);
}

const assetUploader = readRequired("src/components/Admin/AssetUploader.tsx");
requireIncludes("src/components/Admin/AssetUploader.tsx", assetUploader, "serverUploadEndpoint");
requireIncludes("src/components/Admin/AssetUploader.tsx", assetUploader, "authFetch(serverUploadEndpoint");

const createDropModal = readRequired("src/components/Admin/CreateDropModal.tsx");
requireIncludes("src/components/Admin/CreateDropModal.tsx", createDropModal, "/api/admin/content");
requireIncludes("src/components/Admin/CreateDropModal.tsx", createDropModal, "/api/creator/drops/assets");

for (const filePath of apiRouteFiles.filter((filePath) => filePath.startsWith("src/app/api/chat/"))) {
  const content = readRequired(filePath);
  if (!hasUserGuard(content) || !hasTrustedOriginGuard(content)) {
    failures.push(`Chat route lacks authenticated trusted-origin guard: ${filePath}`);
  }
  if (!/safe(Get|List|Send|Hide|Mark)Chat|expectedPrefix/u.test(content)) {
    failures.push(`Chat route lacks participant/path authorization helper: ${filePath}`);
  }
}

const notificationRoute = readRequired("src/app/api/notifications/route.ts");
for (const token of [
  "auth: \"user\"",
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "isNotificationVisibleToUser",
  "fetchUnreadNotificationsForUser",
]) {
  requireIncludes("src/app/api/notifications/route.ts", notificationRoute, token);
}

for (const cronRoute of apiRouteFiles.filter((filePath) => filePath.startsWith("src/app/api/cron/"))) {
  const content = readRequired(cronRoute);
  if (!/CRON_SECRET|authHeader !== `Bearer \$\{cronSecret\}`/u.test(content)) {
    failures.push(`Cron/system route lacks shared secret guard: ${cronRoute}`);
  }
}

const clientFiles = walkFiles("src", (filePath) => /\.(ts|tsx)$/u.test(filePath));
for (const filePath of clientFiles) {
  const content = readRequired(filePath);
  if (!/^\s*["']use client["']/u.test(content)) {
    continue;
  }
  if ([
    "src/app/admin/page.tsx",
    "src/app/admin/user/[userId]/page.tsx",
    "src/app/admin/users/page.tsx",
  ].includes(filePath)) {
    continue;
  }
  if (/@\/lib\/server|server-only|firebase-admin/u.test(content)) {
    failures.push(`Client file imports server-only module: ${filePath}`);
  }
  for (const match of content.matchAll(/process\.env\.([A-Z0-9_]+)/gu)) {
    const envName = match[1] ?? "";
    if (envName !== "NODE_ENV" && !envName.startsWith("NEXT_PUBLIC_")) {
      failures.push(`Client file reads non-public env var ${envName}: ${filePath}`);
    }
  }
}

const creatorProfileRoute = readRequired("src/app/api/creators/[username]/route.ts");
if (/creatorRestrictions|email|phone|idDocument|payout/u.test(creatorProfileRoute.split("return NextResponse.json")[0] ?? "")) {
  failures.push("Public creator profile route may expose private creator fields before response.");
}
requireIncludes("src/app/api/creators/[username]/route.ts", creatorProfileRoute, "isCreatorRole");
requireIncludes("src/app/api/creators/[username]/route.ts", creatorProfileRoute, "isPublicStatus");

for (const filePath of [
  "agent/state/security-role-boundary-audit.generated.json",
  "docs/agent-truth/security-role-boundaries.md",
]) {
  readRequired(filePath);
}

const auditReport = readRequired("agent/state/security-role-boundary-audit.generated.json");
for (const token of [
  "\"resourcePath\"",
  "\"allowedActorTypes\"",
  "\"requiresTrustedOrigin\"",
  "\"requiresEntitlement\"",
  "\"fixedInThisPass\"",
  "\"/api/admin/**\"",
  "\"storage:drops/**\"",
]) {
  requireIncludes("agent/state/security-role-boundary-audit.generated.json", auditReport, token);
}

const docs = readRequired("docs/agent-truth/security-role-boundaries.md");
for (const token of [
  "Actor Lanes",
  "Admin Boundaries",
  "Drop Asset Boundary",
  "Money And Entitlement",
  "Chat And Notifications",
  "Future Agent Rules",
]) {
  requireIncludes("docs/agent-truth/security-role-boundaries.md", docs, token);
}

const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
requireIncludes("FULL_SCALE_CODEBASE_AUDIT.md", fullAudit, "Security Role Boundary Launch Audit");
requireIncludes("REPO_MEMORY_LEDGER.md", repoLedger, "Security role boundaries are server-mediated by actor lane");
requireIncludes("EVERY_FILE_FUNCTION_CHECKLIST.md", checklist, "Security Role Boundary Launch Audit Coverage");

if (failures.length > 0) {
  console.error("Security role boundary validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security role boundary validation passed.");
