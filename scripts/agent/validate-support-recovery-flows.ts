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

function requireStringField(value: Record<string, unknown>, field: string, label: string) {
  if (typeof value[field] !== "string" || value[field].trim().length === 0) {
    failures.push(`${label}.${field} must be a non-empty string.`);
  }
}

const expectedScenarios = [
  "paid_gd_missing",
  "gd_deducted_unlock_failed",
  "unlock_exists_viewer_missing",
  "viewer_asset_missing_broken",
  "notification_duplicated",
  "notification_missing",
  "chat_message_failed",
  "creator_profile_404",
  "user_cannot_login",
  "onboarding_stuck",
  "refund_manual_credit",
  "admin_resend_notification",
  "admin_manual_entitlement_grant",
  "admin_freeze_wallet_user",
  "admin_inspect_transaction_history",
];

const requiredScenarioFields = [
  "id",
  "title",
  "currentVisibility",
  "adminActionAvailable",
  "auditLogRequired",
  "risk",
  "missingUiApiDebugField",
  "fixRecommendation",
  "launchPriority",
];

const audit = parseJson("agent/state/support-recovery-flow-audit.generated.json");
const doc = readRequired("docs/agent-truth/support-recovery-flows.md");
const packageJson = readRequired("package.json");
const adminUsersPage = readRequired("src/app/admin/users/page.tsx");
const adminUserPage = readRequired("src/app/admin/user/[userId]/page.tsx");
const adminSupportQueue = readRequired("src/components/Admin/AdminSupportQueue.tsx");
const balanceModal = readRequired("src/components/Admin/BalanceAdjustmentModal.tsx");
const historyModal = readRequired("src/components/Admin/TransactionHistoryModal.tsx");
const adminBalanceRoute = readRequired("src/app/api/admin/balance/route.ts");
const adminUserDetailRoute = readRequired("src/app/api/admin/user/[userId]/route.ts");
const adminUsersRoute = readRequired("src/app/api/admin/users/route.ts");
const adminUsernameRoute = readRequired("src/app/api/admin/users/[userId]/username/route.ts");
const adminSupportRoute = readRequired("src/app/api/admin/support/threads/route.ts");
const adminSupportThreadRoute = readRequired("src/app/api/admin/support/threads/[threadId]/route.ts");
const supportThreads = readRequired("src/lib/server/support-threads.ts");
const notificationRoute = readRequired("src/app/api/notifications/route.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const dropsUnlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const dropsContentRoute = readRequired("src/app/api/drops/content/route.ts");
const paypalCaptureRoute = readRequired("src/app/api/paypal/capture/route.ts");
const chatThreadRoute = readRequired("src/app/api/chat/threads/[threadId]/route.ts");
const chatMessagesRoute = readRequired("src/app/api/chat/threads/[threadId]/messages/route.ts");
const chatServer = readRequired("src/lib/server/chat.ts");
const creatorProfileRoute = readRequired("src/app/api/creators/[username]/route.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

const scenarios = requireArray(audit.scenarios, "audit.scenarios", expectedScenarios.length);
const scenarioMap = new Map<string, Record<string, unknown>>();
for (const entry of scenarios) {
  if (!entry || typeof entry !== "object") {
    failures.push("Each support recovery scenario must be an object.");
    continue;
  }
  const scenario = entry as Record<string, unknown>;
  const id = typeof scenario.id === "string" ? scenario.id : "";
  if (id) {
    scenarioMap.set(id, scenario);
  }
  for (const field of requiredScenarioFields) {
    requireStringField(scenario, field, `scenario ${id || "<missing-id>"}`);
  }
  if (!Array.isArray(scenario.dataRequired) || scenario.dataRequired.length === 0) {
    failures.push(`scenario ${id || "<missing-id>"}.dataRequired must be a non-empty array.`);
  }
}

for (const id of expectedScenarios) {
  const scenario = scenarioMap.get(id);
  if (!scenario) {
    failures.push(`audit.scenarios must include ${id}.`);
    continue;
  }
  const title = String(scenario.title ?? "");
  if (!doc.includes(title)) {
    failures.push(`support recovery doc must include scenario title "${title}".`);
  }
}

const checks = audit.checks && typeof audit.checks === "object"
  ? audit.checks as Record<string, unknown>
  : {};
for (const key of [
  "adminCanInspectUserWalletLedger",
  "adminCanInspectPurchaseUnlockRecords",
  "adminCanVerifyEntitlement",
  "adminCanSeeNotificationSendReadStatus",
  "adminCanInspectChatConversationSafely",
  "adminActionsAreAudited",
  "manualCreditProtectedAndLogged",
  "manualGrantProtectedAndLogged",
  "missingActionsDocumented",
]) {
  if (!checks[key]) {
    failures.push(`audit.checks must include ${key}.`);
  }
}

for (const expected of [
  "BalanceAdjustmentModal",
  "TransactionHistoryModal",
  "contentUser",
  "unlockedContent",
  "handleManageContent",
  "suspend",
  "ban",
  "activate",
]) {
  requireIncludes(adminUsersPage, expected, "Admin Users page");
}

for (const expected of [
  "Action Ledger",
  "Support handoff",
  "Open support queue",
  "securitySummary",
  "supportReadiness",
  "creatorOps",
]) {
  requireIncludes(adminUserPage, expected, "Admin user detail page");
}

for (const expected of [
  "transactions",
  "purchaseTransactions",
  "completedUnlockTransactions",
  "commerceMetrics",
  "securitySummary",
  "supportReadiness",
  "creatorOps",
]) {
  requireIncludes(adminUserDetailRoute, expected, "Admin user detail route");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "adjustmentReason",
  "adjustedByUid",
  "adjustedByEmail",
  "adjustmentSource",
  "auditedServerSide",
  "admin_adjustment",
]) {
  requireIncludes(adminBalanceRoute, expected, "Admin balance adjustment route");
}

for (const expected of [
  "reason",
  "Actions are permanent",
  "adjustUserBalance",
]) {
  requireIncludes(balanceModal, expected, "Balance adjustment modal");
}

for (const expected of [
  "/api/admin/user/${user.uid}",
  "Transaction History",
  "deriveGumdropEconomics",
  "isCreatorSpendTransactionType",
]) {
  requireIncludes(historyModal, expected, "Transaction history modal");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "unlockedContent: FieldValue.arrayUnion(normalizedDropId)",
  "grantSource: \"admin\"",
  "admin-grant",
  "FieldValue.arrayRemove(normalizedDropId)",
]) {
  requireIncludes(adminUsersRoute, expected, "Admin users mutation route");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "updatedBy",
]) {
  requireIncludes(adminUsernameRoute, expected, "Admin username route");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "listSupportThreadsForAdmin",
  "buildServerAdminModuleVerification",
]) {
  requireIncludes(adminSupportRoute, expected, "Admin support threads route");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "addSupportMessage",
  "updateSupportThreadStatus",
]) {
  requireIncludes(adminSupportThreadRoute, expected, "Admin support thread route");
}

for (const expected of [
  "View Record",
  "/admin/user/${selectedThread.userId}",
  "handleStatusUpdate",
]) {
  requireIncludes(adminSupportQueue, expected, "Admin support queue");
}

for (const expected of [
  "senderId",
  "unreadForAdmin",
  "unreadForUser",
  "getSupportThreadForUser",
  "thread.userId !== userId",
]) {
  requireIncludes(supportThreads, expected, "Support thread server helpers");
}

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "notificationDispatchLocks",
  "idempotencyKey",
  "browserTag",
  "readAtMs",
  "lastReadBy",
]) {
  requireIncludes(notificationRoute, expected, "Notifications API route");
}

for (const expected of [
  "recordNotificationDispatchOutcome",
  "duplicateCreatedPrevented",
  "duplicatePushPrevented",
  "drop_requeued_live",
  "idempotencyKey",
]) {
  requireIncludes(pushNotifications, expected, "Push notification dispatch");
}

for (const expected of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "adminDb.runTransaction",
  "unlockedContent.has(dropId)",
  "buildCompletedGumdropTransaction",
  "alreadyUnlocked",
]) {
  requireIncludes(dropsUnlockRoute, expected, "Drop unlock route");
}

for (const expected of [
  "auth: \"user\"",
  "requireTrustedOrigin: true",
  "ownsDrop",
  "hasUnlockedDrop",
  "You do not own this content",
  "private, no-store",
]) {
  requireIncludes(dropsContentRoute, expected, "Drop content entitlement route");
}

for (const expected of [
  "paymentLocks",
  "existingLock.exists",
  "customId",
  "capturedUserId !== userId",
  "logFailedTransaction",
]) {
  requireIncludes(paypalCaptureRoute, expected, "PayPal capture recovery evidence");
}

for (const expected of [
  "safeGetChatThreadDetailForViewer",
  "safeHideChatThreadForViewer",
  "auth: \"user\"",
  "requireTrustedOrigin: true",
]) {
  requireIncludes(chatThreadRoute, expected, "Chat thread route");
}

for (const expected of [
  "safeSendChatMessageForViewer",
  "auth: \"user\"",
  "requireTrustedOrigin: true",
]) {
  requireIncludes(chatMessagesRoute, expected, "Chat messages route");
}

for (const expected of [
  "You are not allowed to send messages in this thread.",
  "resolveViewerRoleForThread",
  "recordRouteWarning(\"chat/messages\"",
  "buildCompletedGumdropTransaction",
]) {
  requireIncludes(chatServer, expected, "Chat server helpers");
}

for (const expected of [
  "Creator not found",
  "isPublicCreator",
  "isPublicStatus",
  "profileViewsCount",
  "sanitizeDropForClient",
]) {
  requireIncludes(creatorProfileRoute, expected, "Public creator profile route");
}

for (const expected of [
  "Manual DB intervention",
  "PayPal cash refund execution",
  "Wallet-only freeze",
  "General onboarding reset",
  "Per-recipient historical notification resend",
  "arbitrary creator chat transcript",
  "required reason/admin UID/email",
]) {
  requireIncludes(doc, expected, "Support recovery doctrine");
}

for (const expected of [
  "check:support-recovery-flows",
  "scripts/agent/validate-support-recovery-flows.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "Support Recovery Flow Launch Audit",
  "support-recovery-flow-audit.generated.json",
  "support-recovery-flows.md",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "Support recovery flows", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Support Recovery Flow", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Support recovery flow validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Support recovery flow validation passed.");
