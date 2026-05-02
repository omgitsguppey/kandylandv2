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

function requireWorkflowStep(entries: unknown[], stepKey: string) {
  const entry = entries.find((item) => (
    item
    && typeof item === "object"
    && (item as Record<string, unknown>).stepKey === stepKey
  )) as Record<string, unknown> | undefined;

  if (!entry) {
    failures.push(`workflowMap must include ${stepKey}.`);
    return;
  }

  for (const key of [
    "files",
    "currentGuard",
    "userFacingImpact",
    "notificationImpact",
    "entitlementImpact",
    "analyticsImpact",
    "validation",
    "requiredFix",
    "fixedInThisPass",
  ]) {
    if (!(key in entry)) {
      failures.push(`${stepKey} must include ${key}.`);
    }
  }
}

const audit = parseJson("agent/state/admin-cms-workflow-audit.generated.json");
const workflowMap = requireArray(audit.workflowMap, "audit.workflowMap", 15);
const doc = readRequired("docs/agent-truth/admin-cms-drop-workflow.md");
const packageJson = readRequired("package.json");
const adminRoute = readRequired("src/app/api/admin/drops/route.ts");
const creatorRoute = readRequired("src/app/api/creator/drops/route.ts");
const dropMutations = readRequired("src/lib/server/drop-mutations.ts");
const adminForm = readRequired("src/lib/admin-drop-form.ts");
const createModal = readRequired("src/components/Admin/CreateDropModal.tsx");
const adminDropsPage = readRequired("src/app/admin/drops/page.tsx");
const queueToggleRoute = readRequired("src/app/api/admin/queue/toggle/route.ts");
const queueRoute = readRequired("src/app/api/admin/queue/route.ts");
const queueRuntime = readRequired("src/lib/server/queue-runtime.ts");
const sharedQueueRuntime = readRequired("shared/runtime/queue-runtime.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const notificationsRoute = readRequired("src/app/api/notifications/route.ts");
const dropsServer = readRequired("src/lib/server/drops.ts");
const dropsRoute = readRequired("src/app/api/drops/route.ts");
const contentRoute = readRequired("src/app/api/drops/content/route.ts");
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const impressionHook = readRequired("src/hooks/useDropCardImpression.ts");
const cmsTests = readRequired("tests/unit/admin-cms-workflow.spec.ts");
const formTests = readRequired("tests/unit/admin-drop-form.spec.ts");
const pushTests = readRequired("tests/unit/push-notifications.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const stepKey of [
  "create_draft_drop",
  "assign_creator",
  "upload_cover",
  "attach_locked_assets",
  "set_price",
  "set_category_tier",
  "set_expiration_live_window",
  "publish_live",
  "queue_drop",
  "auto_return_live",
  "expire_drop",
  "archive_delete",
  "edit_metadata_after_publish",
  "verify_user_facing_route",
  "verify_notification_trigger",
  "verify_analytics_attribution",
  "verify_entitlement_behavior",
]) {
  requireWorkflowStep(workflowMap, stepKey);
}

requireIncludes(dropMutations, "validateDropPublishState", "server drop publish validator");
requireIncludes(dropMutations, "shouldValidateDropPublishPayload", "server drop publish validator");
requireIncludes(dropMutations, "Title is required before publishing.", "server drop publish validator");
requireIncludes(dropMutations, "Cover or public preview media is required before publishing.", "server drop publish validator");
requireIncludes(dropMutations, "At least one locked content asset is required for content drops.", "server drop publish validator");
requireIncludes(dropMutations, "Gum Drop price must be zero or greater.", "server drop publish validator");
requireIncludes(dropMutations, "Subscriber-only drops require a creator assignment.", "server drop publish validator");

requireIncludes(adminRoute, "auth: \"admin\"", "admin drops route guard");
requireIncludes(adminRoute, "requireTrustedOrigin: true", "admin drops route guard");
requireIncludes(adminRoute, "validateDropPublishState(dropData)", "admin drops create validation");
requireIncludes(adminRoute, "shouldValidateDropPublishPayload(dropData)", "admin drops update validation");
requireIncludes(adminRoute, "drop-activation:${docRef.id}:${resolvedInitial.validFrom}", "admin drops notification idempotency");
requireIncludes(adminRoute, "drop-activation:${dropId}:${nextTiming.validFrom}", "admin drops update notification idempotency");
requireIncludes(adminRoute, "invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS", "admin drops surface invalidation");

requireIncludes(creatorRoute, "auth: \"user\"", "creator drops route guard");
requireIncludes(creatorRoute, "scopeToCaller: true", "creator drops route guard");
requireIncludes(creatorRoute, "requireCreator(caller.uid)", "creator drops route role guard");
requireIncludes(creatorRoute, "creatorIdOverride: caller.uid", "creator drops publish validation");
requireIncludes(creatorRoute, "requireCreator: true", "creator drops publish validation");
requireIncludes(creatorRoute, "approvalStatus: \"pending_review\"", "creator drops review state");

requireIncludes(adminForm, "dropFormSchema", "admin drop form validation");
requireIncludes(adminForm, "z.coerce.number().min(0", "admin drop price validation");
requireIncludes(adminForm, "At least one content file is required", "admin drop content validation");
requireIncludes(adminForm, "isValidAdminDropActionUrl", "admin drop action URL validation");
requireIncludes(adminForm, "creatorId", "admin creator assignment field");
requireIncludes(createModal, "Creator name {mode === \"admin\" ? \"(optional)\" : \"\"}", "admin modal optional creator assignment");
requireIncludes(createModal, "serverUploadEndpoint", "admin modal server-mediated uploads");
requireIncludes(createModal, "/api/admin/content", "admin modal admin upload route");
requireIncludes(createModal, "/api/creator/drops/assets", "admin modal creator upload route");
requireIncludes(createModal, "/api/drops/duplicate-filenames", "admin modal duplicate filename check");

requireIncludes(adminDropsPage, "handleReviewSubmission", "admin drops review controls");
requireIncludes(adminDropsPage, "toggleAutoQueue", "admin drops queue toggle");
requireIncludes(adminDropsPage, "openNotificationDraft", "admin drops notification draft");
requireIncludes(adminDropsPage, "sendNotification", "admin drops manual notification");
requireIncludes(queueRoute, "auth: \"admin\"", "queue route admin guard");
requireIncludes(queueToggleRoute, "auth: \"admin\"", "queue toggle admin guard");
requireIncludes(queueToggleRoute, "requireTrustedOrigin: true", "queue toggle trusted origin");

requireIncludes(sharedQueueRuntime, "autoQueuedDropIds.add(drop.id)", "queue lifecycle auto-return");
requireIncludes(sharedQueueRuntime, "activationKey: `drop-activation:${drop.id}:${drop.validFrom || 0}`", "queue lifecycle activation key");
requireIncludes(queueRuntime, "sendTargetedDropNotification", "queue runtime notification dispatch");
requireIncludes(queueRuntime, "recordQueueJobHeartbeat", "queue runtime diagnostics");

requireIncludes(pushNotifications, "buildNotificationIdempotencyKey", "push notification idempotency");
requireIncludes(pushNotifications, "buildBrowserNotificationTag", "push notification browser tag");
requireIncludes(pushNotifications, "reserveDropActivationNotification", "push notification activation reserve");
requireIncludes(notificationsRoute, "buildNotificationIdempotencyKey", "manual notification idempotency");

requireIncludes(dropsServer, "sanitizeDropForClient", "public drops payload sanitization");
requireIncludes(dropsRoute, "isDropActiveNow", "public drops active filter");
requireIncludes(dropGrid, "DropCard", "drop card render after publish");
requireIncludes(dropCard, "fetch(`/api/drops/${drop.id}/click`", "drop card click route");
requireIncludes(impressionHook, "drop_card_impression", "drop analytics attribution");
requireIncludes(unlockRoute, "drop_id: dropId", "unlock analytics attribution");
requireIncludes(unlockRoute, "creator_id: result.creatorId", "unlock creator attribution");
requireIncludes(contentRoute, "hasUnlockedDrop", "content entitlement route");

requireIncludes(cmsTests, "blocks publishing a content drop", "admin CMS workflow tests");
requireIncludes(cmsTests, "allows an admin-created content drop", "admin CMS workflow tests");
requireIncludes(cmsTests, "generates one deterministic return-live notification", "admin CMS workflow tests");
requireIncludes(formTests, "still requires content assets", "admin drop form tests");
requireIncludes(pushTests, "does not send a return-live FCM push", "push notification tests");

requireIncludes(doc, "Admin CMS Drop Workflow", "admin CMS workflow doc");
requireIncludes(doc, "Creator assignment", "admin CMS workflow doc");
requireIncludes(doc, "Publish Gate", "admin CMS workflow doc");
requireIncludes(doc, "Queue and Return-Live", "admin CMS workflow doc");
requireIncludes(doc, "Archive/Delete", "admin CMS workflow doc");
requireIncludes(doc, "Analytics Attribution", "admin CMS workflow doc");
requireIncludes(doc, "Entitlement Behavior", "admin CMS workflow doc");
requireIncludes(packageJson, "\"check:admin-cms-workflow\"", "package scripts");
requireIncludes(auditLedger, "Admin CMS Drop Workflow Launch Audit", "FULL_SCALE_CODEBASE_AUDIT");
requireIncludes(repoLedger, "Admin CMS Drop workflow", "REPO_MEMORY_LEDGER");
requireIncludes(checklist, "Admin CMS Drop Workflow Launch Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST");

if (failures.length > 0) {
  console.error("Admin CMS workflow validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin CMS workflow validation passed.");
