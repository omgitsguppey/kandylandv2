import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

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

function inspectSupportEvidenceBindings(hookText: string, queueText: string) {
  const hookAst = ts.createSourceFile("useAdminSupportRealtime.ts", hookText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const queueAst = ts.createSourceFile("AdminSupportQueue.tsx", queueText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues: string[] = [];
  function nodes<T extends ts.Node>(rootNode: ts.Node, match: (node: ts.Node) => node is T): T[] {
    const found: T[] = [];
    const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
    visit(rootNode); return found;
  }
  function expression(value: ts.Expression | undefined): ts.Expression | undefined {
    while (value && (ts.isParenthesizedExpression(value) || ts.isAwaitExpression(value) || ts.isAsExpression(value) || ts.isTypeAssertionExpression(value) || ts.isNonNullExpression(value))) value = value.expression;
    return value;
  }
  function imported(ast: ts.SourceFile, module: string, name: string) {
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== module) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) if ((element.propertyName ?? element.name).text === name) return element.name.text;
    }
    return undefined;
  }
  function identifier(value: ts.Expression | undefined, name: string | undefined) {
    value = expression(value); return Boolean(name && value && ts.isIdentifier(value) && value.text === name);
  }
  function property(value: ts.Expression | undefined, name: string) {
    value = expression(value);
    if (!value || !ts.isObjectLiteralExpression(value)) return undefined;
    for (const entry of value.properties) if (ts.isPropertyAssignment(entry) && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) && entry.name.text === name) return entry.initializer;
    return undefined;
  }
  function locals(body: ts.Block | undefined) {
    const values = new Map<string, ts.Expression>();
    for (const statement of body?.statements ?? []) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.initializer) values.set(declaration.name.text, declaration.initializer);
    return values;
  }
  function resolve(value: ts.Expression | undefined, values: Map<string, ts.Expression>, seen = new Set<string>()): ts.Expression | undefined {
    value = expression(value);
    if (value && ts.isIdentifier(value) && values.has(value.text) && !seen.has(value.text)) return resolve(values.get(value.text), values, new Set([...seen, value.text]));
    return value;
  }
  function returned(body: ts.Block | undefined) {
    return body?.statements.filter(ts.isReturnStatement).at(-1)?.expression;
  }
  function declaration(ast: ts.SourceFile, name: string) {
    return ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  }
  function calls(node: ts.Node | undefined, name?: string) {
    return node && name ? nodes(node, ts.isCallExpression).filter(call => identifier(call.expression, name)) : [];
  }
  const hook = declaration(hookAst, "useAdminSupportRealtime");
  const hookValues = locals(hook?.body);
  const decodeName = imported(hookAst, "@/lib/ui-continuity", "readUiJson");
  const fetchName = imported(hookAst, "@/lib/authFetch", "authFetch");
  const hookCallbackName = imported(hookAst, "react", "useCallback");
  for (const [callbackName, errorSetter] of [["refreshThreads", "setThreadsError"], ["refreshMessages", "setMessageState"]] as const) {
    const initialization = expression(hookValues.get(callbackName));
    const callback = initialization && ts.isCallExpression(initialization) && identifier(initialization.expression, hookCallbackName) ? initialization.arguments[0] : undefined;
    const body = callback && ts.isArrowFunction(callback) && ts.isBlock(callback.body) ? callback.body : undefined;
    const readValues = [...locals(body).values(), ...(body?.statements.filter(ts.isTryStatement).flatMap(statement => [...locals(statement.tryBlock).values()]) ?? [])];
    const decodedCall = readValues.map(expression).find(call => {
      if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return false;
      const helper = declaration(hookAst, call.expression.text);
      const values = locals(helper?.body);
      const decoded = resolve(returned(helper?.body), values);
      if (!decoded || !ts.isCallExpression(decoded) || !identifier(decoded.expression, decodeName) || property(decoded.arguments[1], "requireSuccess")?.kind !== ts.SyntaxKind.TrueKeyword) return false;
      const transport = resolve(decoded.arguments[0], values);
      return Boolean(transport && ts.isCallExpression(transport) && identifier(transport.expression, fetchName));
    });
    if (!body || !decodedCall) issues.push(`${callbackName} must consume the returned canonical typed readUiJson acknowledgement from authFetch.`);
    const retainsTypedError = body && nodes(body, ts.isCatchClause).some(caught => {
      const caughtName = caught.variableDeclaration && ts.isIdentifier(caught.variableDeclaration.name) ? caught.variableDeclaration.name.text : undefined;
      return calls(caught.block, errorSetter).some(setter => nodes(setter, ts.isConditionalExpression).some(branch => {
        const condition = expression(branch.condition);
        return Boolean(condition && ts.isBinaryExpression(condition) && condition.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && identifier(condition.left, caughtName) && identifier(condition.right, "Error") && identifier(branch.whenTrue, caughtName));
      }));
    });
    if (!retainsTypedError) issues.push(`${callbackName} must retain the original typed Error in its published error state.`);
  }
  const hookOutput = expression(returned(hook?.body));
  const publishedListError = hookOutput && ts.isObjectLiteralExpression(hookOutput) && hookOutput.properties.some(entry => ts.isShorthandPropertyAssignment(entry) && entry.name.text === "threadsError" || ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === "threadsError" && identifier(entry.initializer, "threadsError"));
  const publishedDetailError = expression(property(hookOutput, "messagesError"));
  if (!publishedListError || !publishedDetailError || !ts.isPropertyAccessExpression(publishedDetailError) || publishedDetailError.name.text !== "error") issues.push("Canonical Admin support hook must publish the retained list/detail error states.");
  const queue = declaration(queueAst, "AdminSupportQueue");
  const queueHookName = imported(queueAst, "@/hooks/useAdminSupportRealtime", "useAdminSupportRealtime");
  const reporterName = imported(queueAst, "@/lib/client-error-reporting", "reportClientIssue");
  const classifierName = imported(queueAst, "@/lib/errors/client-error-adapter", "resolveClientActionError");
  const effectName = imported(queueAst, "react", "useEffect");
  const errors = new Map<string, string>();
  for (const statement of queue?.body?.statements ?? []) if (ts.isVariableStatement(statement)) for (const variable of statement.declarationList.declarations) {
    const value = expression(variable.initializer);
    if (!value || !ts.isCallExpression(value) || !identifier(value.expression, queueHookName) || !ts.isObjectBindingPattern(variable.name)) continue;
    for (const binding of variable.name.elements) if (ts.isIdentifier(binding.name)) {
      const key = binding.propertyName && ts.isIdentifier(binding.propertyName) ? binding.propertyName.text : binding.name.text;
      if (key === "threadsError" || key === "messagesError") errors.set(key, binding.name.text);
    }
  }
  function safeMessage(value: ts.Expression | undefined, errorName: string) {
    value = expression(value);
    if (!value || !ts.isCallExpression(value) || !ts.isIdentifier(value.expression) || !identifier(value.arguments[0], errorName)) return false;
    const helper = declaration(queueAst, value.expression.text);
    const parameter = helper?.parameters[0]?.name;
    const parameterName = parameter && ts.isIdentifier(parameter) ? parameter.text : undefined;
    const result = expression(returned(helper?.body));
    if (result && ts.isConditionalExpression(result)) {
      const condition = expression(result.condition);
      if (!condition || !ts.isBinaryExpression(condition) || condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken || !ts.isPropertyAccessExpression(condition.left) || condition.left.name.text !== "errorKey" || !ts.isStringLiteral(condition.right) || condition.right.text !== "unknown_error") return false;
    }
    const operatorCopy = result && ts.isConditionalExpression(result) ? expression(result.whenFalse) : result;
    if (!operatorCopy || !ts.isPropertyAccessExpression(operatorCopy) || operatorCopy.name.text !== "operatorMessage") return false;
    const descriptor = resolve(operatorCopy.expression, locals(helper?.body));
    if (!descriptor || !ts.isPropertyAccessExpression(descriptor) || descriptor.name.text !== "descriptor") return false;
    const classified = expression(descriptor.expression);
    const surface = classified && ts.isCallExpression(classified) ? property(classified.arguments[1], "surface") : undefined;
    return Boolean(classified && ts.isCallExpression(classified) && identifier(classified.expression, classifierName) && identifier(classified.arguments[0], parameterName) && surface && ts.isStringLiteral(surface) && surface.text === "admin_truth");
  }
  for (const key of ["threadsError", "messagesError"] as const) {
    const errorName = errors.get(key);
    if (!errorName) { issues.push(`Admin Support Queue must consume ${key} from its canonical active hook.`); continue; }
    const displayed = nodes(returned(queue?.body) ?? queueAst, ts.isCallExpression).some(call => safeMessage(call, errorName));
    if (!displayed) issues.push(`${key} must reach the rendered canonical safe operator message.`);
    const reported = calls(queue?.body, effectName).some(effect => {
      const callback = effect.arguments[0];
      const dependencies = effect.arguments[1];
      if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body) || !dependencies || !ts.isArrayLiteralExpression(dependencies) || !dependencies.elements.some(value => identifier(value as ts.Expression, errorName))) return false;
      const guard = callback.body.statements.some(statement => ts.isIfStatement(statement) && ts.isPrefixUnaryExpression(statement.expression) && statement.expression.operator === ts.SyntaxKind.ExclamationToken && identifier(statement.expression.operand, errorName) && ts.isReturnStatement(statement.thenStatement));
      return guard && calls(callback.body, reporterName).some(call => safeMessage(property(property(call.arguments[0], "detail"), "message"), errorName));
    });
    if (!reported) issues.push(`${key} must reach guarded reportClientIssue.detail.message through the same canonical safe classifier.`);
  }
  return issues;
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
]) {
  requireIncludes(adminSupportHook, expected, "Admin support API consumer");
}
failures.push(...inspectSupportEvidenceBindings(adminSupportHook, adminSupportQueue));
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
