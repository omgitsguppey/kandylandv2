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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function collectIds(items: unknown[], label: string) {
  const ids = new Set<string>();
  for (const item of items) {
    const record = asRecord(item);
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
      failures.push(`${label} entries must include a non-empty id.`);
      continue;
    }
    if (ids.has(record.id)) {
      failures.push(`${label} contains duplicate id ${record.id}.`);
    }
    ids.add(record.id);
  }
  return ids;
}

function getRecordById(items: unknown[], id: string) {
  return items.map(asRecord).find((item) => item.id === id) ?? null;
}

function scanForCommittedSecrets(value: unknown, path = "fixture") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForCommittedSecrets(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && /(sk_live|AIza|-----BEGIN|password=|secret=|token=)/i.test(value)) {
      failures.push(`${path} appears to contain a secret-like value.`);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/password|secret|token|apiKey|privateKey/i.test(key)) {
      if (nested !== false && nested !== null && nested !== "" && !(Array.isArray(nested) && nested.length === 0)) {
        failures.push(`${path}.${key} must not commit credential material.`);
      }
    }
    scanForCommittedSecrets(nested, `${path}.${key}`);
  }
}

const audit = parseJson("agent/state/test-fixtures-demo-audit.generated.json");
const fixtures = parseJson("tests/fixtures/launch-demo-fixtures.json");
const doc = readRequired("docs/agent-truth/test-fixtures-demo-accounts.md");
const packageJson = readRequired("package.json");
const unitTest = readRequired("tests/unit/test-fixtures-demo.spec.ts");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const unlockTest = readRequired("tests/unit/drops-unlock-route.spec.ts");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");
const notificationTest = readRequired("tests/unit/notifications-route.spec.ts");
const chatTest = readRequired("tests/unit/chat-thread-route.spec.ts");
const firestoreRulesTest = readRequired("tests/firebase/firestore.rules.spec.ts");
const storageRulesTest = readRequired("tests/firebase/storage.rules.spec.ts");

const requiredPersonas = [
  "guest_visitor",
  "new_user",
  "user_zero_gd",
  "user_gd_balance",
  "user_unlocked_drop",
  "user_failed_purchase",
  "creator_profile_public_drops",
  "admin",
  "user_notification_read_unread",
  "user_chat_thread",
];

const requiredDropStates = [
  "expired",
  "queued",
  "live_ending_soon",
  "archived",
  "live_missing_cover",
  "live_locked_assets",
];

const requiredCriticalPaths = [
  "guest_to_signup",
  "wallet_refill_and_unlock",
  "owned_library_viewer",
  "notification_read_clear",
  "chat_thread",
  "admin_truth_and_recovery",
];

if (fixtures.environment !== "local_or_test_only") {
  failures.push("Fixture environment must be local_or_test_only.");
}
if (fixtures.writesLiveDataByDefault !== false || fixtures.productionWritesAllowed !== false) {
  failures.push("Fixture contract must not write live/production data by default.");
}
if (audit.productionSafety && typeof audit.productionSafety === "object") {
  const safety = audit.productionSafety as Record<string, unknown>;
  if (safety.createsProductionUsers !== false || safety.writesLiveDataByDefault !== false || safety.commitsSensitiveCredentials !== false) {
    failures.push("Audit productionSafety must explicitly forbid production users, live writes, and committed credentials.");
  }
} else {
  failures.push("Audit must include productionSafety.");
}

scanForCommittedSecrets(fixtures);

const personas = requireArray(fixtures.personas, "fixtures.personas", requiredPersonas.length);
const personaIds = collectIds(personas, "fixtures.personas");
for (const id of requiredPersonas) {
  if (!personaIds.has(id)) {
    failures.push(`fixtures.personas must include ${id}.`);
  }
  requireIncludes(doc, id, "Fixture doctrine doc");
}

for (const id of requiredPersonas) {
  const persona = getRecordById(personas, id);
  if (!persona) continue;
  if (!Array.isArray(persona.exercises) || persona.exercises.length === 0) {
    failures.push(`${id} must declare exercises.`);
  }
  if (id !== "guest_visitor" && persona.credentialRequired !== true) {
    failures.push(`${id} must mark credentialRequired true without committing credentials.`);
  }
}

const zeroGd = asRecord(getRecordById(personas, "user_zero_gd")?.profile);
if (zeroGd.gumDropsBalance !== 0 || zeroGd.gumDropsPurchasedBalance !== 0 || zeroGd.gumDropsRewardBalance !== 0) {
  failures.push("user_zero_gd must have zero total, paid, and reward GumDrops.");
}

const balanceUser = asRecord(getRecordById(personas, "user_gd_balance")?.profile);
for (const field of ["gumDropsBalance", "gumDropsPurchasedBalance", "gumDropsRewardBalance"]) {
  if (typeof balanceUser[field] !== "number" || Number(balanceUser[field]) <= 0) {
    failures.push(`user_gd_balance.profile.${field} must be a positive number.`);
  }
}

const unlockedUser = asRecord(getRecordById(personas, "user_unlocked_drop")?.profile);
if (!Array.isArray(unlockedUser.unlockedContent) || !unlockedUser.unlockedContent.includes("fixture_drop_locked_assets")) {
  failures.push("user_unlocked_drop must include fixture_drop_locked_assets in unlockedContent.");
}
const unlockedTimestamps = asRecord(unlockedUser.unlockedContentTimestamps);
if (typeof unlockedTimestamps.fixture_drop_locked_assets !== "number") {
  failures.push("user_unlocked_drop must include unlockedContentTimestamps for fixture_drop_locked_assets.");
}

const failedPurchaseUser = getRecordById(personas, "user_failed_purchase");
const failedPurchaseRecords = requireArray(failedPurchaseUser?.purchaseRecords, "user_failed_purchase.purchaseRecords", 1).map(asRecord);
if (!failedPurchaseRecords.some((record) => record.status === "failed" && record.creditedGumDrops === 0)) {
  failures.push("user_failed_purchase must include failed purchase with zero credited GumDrops.");
}

const notificationUser = getRecordById(personas, "user_notification_read_unread");
if (!Array.isArray(notificationUser?.notificationIds) || notificationUser.notificationIds.length < 2) {
  failures.push("user_notification_read_unread must reference read/unread notifications.");
}

const chatUser = getRecordById(personas, "user_chat_thread");
if (!Array.isArray(chatUser?.chatThreadIds) || !chatUser.chatThreadIds.includes("fixture_chat_thread_user_creator")) {
  failures.push("user_chat_thread must reference fixture_chat_thread_user_creator.");
}

const drops = requireArray(fixtures.drops, "fixtures.drops", requiredDropStates.length);
const dropIds = collectIds(drops, "fixtures.drops");
for (const state of requiredDropStates) {
  if (!drops.map(asRecord).some((drop) => drop.state === state)) {
    failures.push(`fixtures.drops must include state ${state}.`);
  }
  requireIncludes(doc, state, "Fixture doctrine doc");
}
for (const drop of drops.map(asRecord)) {
  if (!dropIds.has(String(drop.id))) continue;
  if (typeof drop.unlockCost !== "number" || drop.unlockCost < 0) {
    failures.push(`${drop.id}.unlockCost must be a non-negative number.`);
  }
  if (drop.contentAccess === "requiresEntitlement" && drop.state === "live_locked_assets") {
    const assets = requireArray(drop.lockedAssets, `${drop.id}.lockedAssets`, 1).map(asRecord);
    if (!assets.every((asset) => asset.publicUrlCommitted === false && typeof asset.storagePath === "string")) {
      failures.push(`${drop.id}.lockedAssets must use test-only storage paths and publicUrlCommitted=false.`);
    }
  }
}

const notifications = requireArray(fixtures.notifications, "fixtures.notifications", 2).map(asRecord);
if (!notifications.some((note) => note.read === false) || !notifications.some((note) => note.read === true)) {
  failures.push("fixtures.notifications must include both unread and read notifications.");
}
for (const note of notifications) {
  if (typeof note.idempotencyKey !== "string" || !String(note.idempotencyKey).includes(":")) {
    failures.push(`${note.id ?? "notification"} must include a deterministic idempotencyKey.`);
  }
}

const chatThreads = requireArray(fixtures.chatThreads, "fixtures.chatThreads", 1).map(asRecord);
if (!chatThreads.some((thread) => Array.isArray(thread.participantIds) && thread.participantIds.includes("fixture_user_chat") && thread.participantIds.includes("fixture_creator_public"))) {
  failures.push("fixtures.chatThreads must include a user/creator participant thread.");
}

const transactions = requireArray(fixtures.transactions, "fixtures.transactions", 3).map(asRecord);
if (!transactions.some((tx) => Number(tx.paidGumDrops) > 0 && Number(tx.bonusGumDrops) > 0)) {
  failures.push("fixtures.transactions must distinguish paid and bonus GumDrops.");
}
if (!transactions.some((tx) => Number(tx.adminGumDrops) > 0)) {
  failures.push("fixtures.transactions must include admin-granted GumDrops separately.");
}
if (!transactions.some((tx) => tx.type === "unlock_content" && Number(tx.paidGumDropsSpent) > 0)) {
  failures.push("fixtures.transactions must include an unlock spend fixture.");
}

const criticalPaths = requireArray(fixtures.criticalPaths, "fixtures.criticalPaths", requiredCriticalPaths.length).map(asRecord);
for (const id of requiredCriticalPaths) {
  const path = criticalPaths.find((entry) => entry.id === id);
  if (!path) {
    failures.push(`fixtures.criticalPaths must include ${id}.`);
    continue;
  }
  if (!Array.isArray(path.personaIds) || path.personaIds.length === 0 || !Array.isArray(path.surfaces) || path.surfaces.length === 0) {
    failures.push(`${id} must include personaIds and surfaces.`);
  }
}

const auditPersonas = requireArray(audit.fixturePersonas, "audit.fixturePersonas", requiredPersonas.length);
const auditPersonaIds = collectIds(auditPersonas, "audit.fixturePersonas");
for (const id of requiredPersonas) {
  if (!auditPersonaIds.has(id)) failures.push(`audit.fixturePersonas must include ${id}.`);
}
const auditDrops = requireArray(audit.fixtureDrops, "audit.fixtureDrops", requiredDropStates.length).map(asRecord);
for (const state of requiredDropStates) {
  if (!auditDrops.some((drop) => drop.state === state)) failures.push(`audit.fixtureDrops must include state ${state}.`);
}
const auditPaths = requireArray(audit.criticalPathCoverage, "audit.criticalPathCoverage", requiredCriticalPaths.length).map(asRecord);
for (const id of requiredCriticalPaths) {
  if (!auditPaths.some((path) => path.id === id && path.coveredByFixtureContract === true)) {
    failures.push(`audit.criticalPathCoverage must mark ${id} covered.`);
  }
}

for (const expected of [
  "check:test-fixtures-demo",
  "scripts/agent/validate-test-fixtures-demo.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}
for (const expected of [
  "tests/fixtures/launch-demo-fixtures.json",
  "Do not create production users.",
  "Do not write live Firestore",
  "No passwords",
  "npx vitest run tests/unit/test-fixtures-demo.spec.ts",
]) {
  requireIncludes(doc, expected, "Fixture doctrine doc");
}
for (const expected of [
  "launch-demo-fixtures.json",
  "requiredPersonas",
  "requiredDropStates",
]) {
  requireIncludes(unitTest, expected, "Fixture unit test");
}
for (const expected of [
  "gumDropsPurchasedBalance",
  "gumDropsRewardBalance",
  "alreadyUnlocked",
]) {
  requireIncludes(unlockTest, expected, "Unlock route tests");
}
for (const expected of ["duplicate", "gumDropsPurchasedBalance", "gumDropsRewardBalance"]) {
  requireIncludes(paypalTest, expected, "PayPal capture tests");
}
for (const expected of ["readBy", "successCount", "notificationIds"]) {
  requireIncludes(notificationTest, expected, "Notification route tests");
}
for (const expected of ["thread_1", "messages", "viewerUid"]) {
  requireIncludes(chatTest, expected, "Chat thread tests");
}
for (const expected of ["seedFirestore", "notifications/notif-alice"]) {
  requireIncludes(firestoreRulesTest, expected, "Firestore rules tests");
}
for (const expected of ["seedAvatar", "DROP_FILE_PATH"]) {
  requireIncludes(storageRulesTest, expected, "Storage rules tests");
}
for (const expected of [
  "Test Fixtures Demo Account Launch Audit",
  "test-fixtures-demo-audit.generated.json",
  "npm run check:test-fixtures-demo",
]) {
  requireIncludes(fullAudit, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "Test fixtures and demo states are launch-mapped", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Test Fixtures Demo Account Launch Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Test fixtures/demo validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Test fixtures/demo validation passed.");
