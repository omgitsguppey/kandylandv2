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

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

const contract = readRequired("src/lib/debug-evidence-contract.ts");
const store = readRequired("src/lib/server/debug-evidence-store.ts");
const clientReporting = readRequired("src/lib/client-error-reporting.ts");
const routeDiagnostics = readRequired("src/lib/server/route-diagnostics.ts");
const authErrors = readRequired("src/lib/server/auth.ts");
const evidenceRoute = readRequired("src/app/api/debug/evidence/route.ts");
const injectScript = readRequired("scripts/agent/inject-debug-evidence.ts");
const loadScript = readRequired("scripts/agent/load-debug-evidence-for-audit.ts");
const precatchScript = readRequired("scripts/agent/precatch-runtime-issues.ts");
const validator = readRequired("scripts/agent/validate-debug-evidence-pipeline.ts");
const scoreScript = readRequired("scripts/agent/score-public-beta-readiness.ts");
const adminListRoute = readRequired("src/app/api/admin/support/threads/route.ts");
const adminDetailRoute = readRequired("src/app/api/admin/support/threads/[threadId]/route.ts");
const userListRoute = readRequired("src/app/api/support/threads/route.ts");
const userDetailRoute = readRequired("src/app/api/support/threads/[threadId]/route.ts");
const supportHelper = readRequired("src/lib/server/support-threads.ts");
const adminSupportHook = readRequired("src/hooks/useAdminSupportRealtime.ts");
const adminSupportQueue = readRequired("src/components/Admin/AdminSupportQueue.tsx");
const firestoreRules = readRequired("firestore.rules");
const adminSupportTests = readRequired("tests/unit/admin-support-threads-route.spec.ts");
const supportRouteTests = readRequired("tests/unit/support-threads-route.spec.ts");
const firestoreRuleTests = readRequired("tests/firebase/firestore.rules.spec.ts");
const docs = readRequired("docs/agent-truth/debug-evidence-pipeline.md");
const supportDocs = readRequired("docs/agent-truth/support-recovery-flows.md");
const publicBetaDocs = readRequired("docs/agent-truth/public-beta-score.md");
const packageJson = readRequired("package.json");
const evidenceIndex = readRequired("agent/state/debug-evidence-index.generated.json");
const precatchIndex = readRequired("agent/state/precatch-runtime-issues.generated.json");

for (const expected of [
  "type DebugEvidenceRecord",
  "DEBUG_EVIDENCE_BUCKETS",
  "debug_evidence",
  "debug_evidence_rollups",
  "runtime_warning_records",
  "redactDebugEvidenceForAudit",
  "mapDebugCategoryToAuditDomains",
]) {
  requireIncludes(contract, expected, "Debug evidence contract");
}

for (const expected of [
  ".collection(DEBUG_EVIDENCE_BUCKETS.rollups)",
  ".doc(initialRecord.fingerprint)",
  "runTransaction",
  "occurrenceCount",
  "listRecentDebugEvidence",
]) {
  requireIncludes(store, expected, "Debug evidence store");
}

for (const expected of [
  "queueDebugEvidenceWrite",
  "requestIdleCallback",
  "/api/debug/evidence",
]) {
  requireIncludes(clientReporting, expected, "Client debug evidence bridge");
}

for (const expected of [
  "recordDebugEvidence",
  "inferDebugEvidenceCategory",
]) {
  requireIncludes(routeDiagnostics + authErrors, expected, "Route debug evidence integration");
}

for (const expected of [
  "auth: \"none\"",
  "requireTrustedOrigin: true",
  "recordDebugEvidence",
]) {
  requireIncludes(evidenceRoute, expected, "Debug evidence ingest route");
}

for (const expected of [
  "DEBUG_EVIDENCE_INDEX_PATH",
  "loadDebugEvidenceForAuditDomain",
  "loadDebugEvidenceForAuditDomains",
  "limitCount = 10",
]) {
  requireIncludes(loadScript, expected, "Audit debug evidence loader");
}

for (const expected of [
  "PrecatchIssue",
  "repeated support permission denied",
  "writePrecatchRuntimeIssues",
  "precatch-runtime-issues.generated.json",
]) {
  requireIncludes(precatchScript, expected, "Runtime pre-catcher");
}

requireIncludes(scoreScript, "debugEvidence", "Public beta score debug evidence injection");
requireIncludes(scoreScript, "loadDebugEvidenceForAuditDomains", "Public beta score debug evidence injection");

for (const expected of [
  "auth: \"admin\"",
  "requireTrustedOrigin: true",
  "listSupportThreadsForAdmin",
]) {
  requireIncludes(adminListRoute, expected, "Admin support list route");
}

for (const expected of [
  "auth: \"admin\"",
  "getSupportThreadForAdmin",
  "addSupportMessage",
  "senderRole: \"admin\"",
  "withRouteRuntimeHealth(\"admin/support/threads/[threadId]:GET\"",
]) {
  requireIncludes(adminDetailRoute, expected, "Admin support detail/reply route");
}

for (const expected of [
  "auth: \"user\"",
  "listSupportThreadsForUser",
  "createSupportThread",
]) {
  requireIncludes(userListRoute, expected, "User support list route");
}

for (const expected of [
  "auth: \"user\"",
  "getSupportThreadForUser",
  "senderRole: \"user\"",
]) {
  requireIncludes(userDetailRoute, expected, "User support detail route");
}

for (const expected of [
  "thread.userId !== userId",
  "throw new AuthError(\"Forbidden\", 403)",
  "getSupportThreadForAdmin",
  "listThreadMessages(threadId)",
]) {
  requireIncludes(supportHelper, expected, "Support helper privacy boundary");
}

for (const expected of [
  "/api/admin/support/threads?status=all",
  "`/api/admin/support/threads/${selectedThreadId}`",
  "Admin support thread read was blocked. Check admin role, support_threads rules, and admin support API route.",
  "Support message detail route returned forbidden.",
]) {
  requireIncludes(adminSupportHook, expected, "Admin support API consumer");
}
requireNotIncludes(adminSupportHook, "onSnapshot", "Admin support API consumer");
requireNotIncludes(adminSupportHook, "collection(db", "Admin support API consumer");
requireIncludes(adminSupportQueue, "API Verified", "Admin support dashboard source label");

for (const expected of [
  "match /support_threads/{threadId}",
  "match /support_messages/{messageId}",
  "isAdmin() || (isSignedIn() && request.auth.uid == resource.data.userId)",
  "debug_evidence",
  "debug_evidence_rollups",
]) {
  requireIncludes(firestoreRules, expected, "Firestore support/debug rules");
}

for (const expected of [
  "reads, replies to, and updates an admin support thread",
  "non-admin cannot call admin support routes",
  "verification",
]) {
  requireIncludes(adminSupportTests, expected, "Admin support route tests");
}

for (const expected of [
  "lists the current user's support threads",
  "creates a support thread",
  "Forbidden",
]) {
  requireIncludes(supportRouteTests, expected, "User support route tests");
}

for (const expected of [
  "allows admins to read chat threads, messages, and security events in the client",
  "allows users to read their own support threads",
  "blocks users from reading other users support threads",
  "debug_evidence_rollups",
]) {
  requireIncludes(firestoreRuleTests, expected, "Firestore support/debug rule tests");
}

for (const source of [evidenceIndex, precatchIndex]) {
  requireNotIncludes(source, "\"body\"", "Public generated debug artifacts");
  requireNotIncludes(source, "user@example.com", "Public generated debug artifacts");
  requireNotIncludes(source, "Authorization", "Public generated debug artifacts");
  requireNotIncludes(source, "contentUrl", "Public generated debug artifacts");
}

for (const expected of [
  "\"debug:evidence:inject\": \"tsx scripts/agent/inject-debug-evidence.ts\"",
  "\"precheck:runtime-issues\": \"tsx scripts/agent/precatch-runtime-issues.ts\"",
  "\"check:debug-evidence-pipeline\": \"tsx scripts/agent/validate-debug-evidence-pipeline.ts\"",
]) {
  requireIncludes(packageJson, expected, "Package scripts");
}

const doctrineNote = "KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits.";
for (const [label, source] of [
  ["debug evidence doc", docs],
  ["support recovery doc", supportDocs],
  ["public beta score doc", publicBetaDocs],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
requireIncludes(validator, "no sensitive message body", "Debug evidence validator self-check wording");

if (failures.length > 0) {
  console.error("Debug evidence pipeline validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Debug evidence pipeline validation passed.");
