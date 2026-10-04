import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";

// These three existing readers share one bounded source inspection owner.
// A marker in a comment, string or unrendered component is not a rendered control.
const sourceAstCache = new Map<string, ts.SourceFile>();
const sourceFunctionCache = new WeakMap<ts.SourceFile, Map<string, ts.FunctionLikeDeclaration>>();
const printedExpressionCache = new WeakMap<ts.Node, string>();

export function readSourceAst(path: string, rootDirectory = process.cwd()) {
  const cacheKey = join(rootDirectory, path);
  const cached = sourceAstCache.get(cacheKey);
  if (cached) return cached;
  const source = ts.createSourceFile(path, readFileSync(join(rootDirectory, path), "utf8"), ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const diagnostics = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
  if ((diagnostics?.length ?? 0) > 0) throw new Error(`Invalid source in ${path}.`);
  sourceAstCache.set(cacheKey, source);
  return source;
}

export function someSourceNode(nodes: readonly ts.Node[] | ts.Node | undefined, predicate: (node: ts.Node) => boolean): boolean {
  if (!nodes) return false;
  const roots = Array.isArray(nodes) ? nodes : [nodes as ts.Node];
  const visit = (node: ts.Node): boolean => predicate(node) || Boolean(ts.forEachChild(node, visit));
  return roots.some(visit);
}

export function findSourceFunction(source: ts.SourceFile, name: string): ts.FunctionLikeDeclaration | undefined {
  let functions = sourceFunctionCache.get(source);
  if (!functions) {
    functions = new Map<string, ts.FunctionLikeDeclaration>();
    someSourceNode(source, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        if (node.name) functions!.set(node.name.text, node);
        if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) functions!.set("default", node);
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
        && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) functions!.set(node.name.text, node.initializer);
      return false;
    });
    sourceFunctionCache.set(source, functions);
  }
  return functions.get(name);
}

export function sourceExpressionIs(node: ts.Node | undefined, expected: string) {
  if (!node) return false;
  let printed = printedExpressionCache.get(node);
  if (printed === undefined) {
    printed = ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replace(/\s+/g, "");
    printedExpressionCache.set(node, printed);
  }
  return printed === expected.replace(/\s+/g, "");
}

export function hasSourceCall(nodes: readonly ts.Node[] | ts.Node | undefined, name: string) {
  return someSourceNode(nodes, (node) => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name);
}

export function sourceRenderNodes(source: ts.SourceFile, name: string | ts.FunctionLikeDeclaration = "default") {
  const first = typeof name === "string" ? findSourceFunction(source, name) : name;
  if (!first) return [];
  const queue = [first];
  const visited = new Set<ts.FunctionLikeDeclaration>();
  const rendered: ts.Node[] = [];
  // Returned JSX also contains scalar formatters and deferred action calls.
  // Inspect delegated owners only when this local call graph can produce JSX;
  // render-producing unsupported control flow still fails explicitly below.
  const mayProduceJsx = (owner: ts.FunctionLikeDeclaration, checking = new Set<ts.FunctionLikeDeclaration>()): boolean => {
    if (!owner.body || checking.has(owner)) return false;
    const active = new Set(checking).add(owner);
    return someSourceNode(owner.body, node => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return false;
      const delegated = findSourceFunction(source, node.expression.text);
      return Boolean(delegated && mayProduceJsx(delegated, active));
    });
  };
  const isDeferredJsxAction = (node: ts.Node, expression: ts.Node) => {
    let insideCallback = false;
    for (let parent = node.parent; parent && parent !== expression; parent = parent.parent) {
      if (ts.isFunctionLike(parent)) insideCallback = true;
      if (insideCallback && ts.isJsxAttribute(parent) && /^on[A-Z]/.test(parent.name.getText(source))) return true;
    }
    return false;
  };
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current) || !current.body) continue;
    visited.add(current);
    const returns: ts.Node[] = [];
    if (!ts.isBlock(current.body)) returns.push(current.body);
    else {
      const literalBoolean = (expression: ts.Expression): boolean | undefined => {
        if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)
          || ts.isSatisfiesExpression(expression) || ts.isNonNullExpression(expression)) return literalBoolean(expression.expression);
        if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
          const inner = literalBoolean(expression.operand);
          return inner === undefined ? undefined : !inner;
        }
        return undefined;
      };
      const collectReturns = (node: ts.Node): boolean => {
        if (ts.isFunctionLike(node)) return false;
        if (ts.isReturnStatement(node)) {
          if (node.expression) returns.push(node.expression);
          return true;
        }
        if (ts.isThrowStatement(node)) return true;
        if (ts.isBlock(node)) {
          for (const statement of node.statements) if (collectReturns(statement)) return true;
          return false;
        }
        if (ts.isIfStatement(node)) {
          const condition = literalBoolean(node.expression);
          if (condition === true) return collectReturns(node.thenStatement);
          if (condition === false) return node.elseStatement ? collectReturns(node.elseStatement) : false;
          const thenTerminates = collectReturns(node.thenStatement);
          const elseTerminates = node.elseStatement ? collectReturns(node.elseStatement) : false;
          return thenTerminates && elseTerminates;
        }
        // This owner inspects encountered component render branches, not arbitrary TS control flow.
        // Unsupported control structures must not certify potentially unreachable JSX.
        if (ts.isTryStatement(node) || ts.isSwitchStatement(node) || ts.isIterationStatement(node, false)
          || ts.isLabeledStatement(node) || ts.isWithStatement(node)) {
          throw new Error("Unsupported rendered control flow (" + ts.SyntaxKind[node.kind] + ") in " + source.fileName + ".");
        }
        ts.forEachChild(node, child => { collectReturns(child); });
        return false;
      };
      collectReturns(current.body);
    }
    rendered.push(...returns);
    for (const expression of returns) {
      someSourceNode(expression, (node) => {
        if (isDeferredJsxAction(node, expression)) return false;
        let referenced: string | undefined;
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) referenced = node.expression.text;
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) referenced = node.tagName.text;
        const next = referenced ? findSourceFunction(source, referenced) : undefined;
        if (next && !visited.has(next) && mayProduceJsx(next)) queue.push(next);
        return false;
      });
    }
  }
  return rendered;
}

export function readRenderedOwner(entryPath: string, ownerPath: string, exportName: string, rootDirectory = process.cwd()) {
  const entry = readSourceAst(entryPath, rootDirectory);
  const moduleName = "@/" + ownerPath.replace(/^src\//, "").replace(/\.tsx?$/, "");
  let localName: string | undefined;
  for (const statement of entry.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      localName = bindings.elements.find((element) => (element.propertyName?.text ?? element.name.text) === exportName)?.name.text;
    }
  }
  const connected = localName && someSourceNode(sourceRenderNodes(entry), (node) =>
    (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === localName);
  return connected ? sourceRenderNodes(readSourceAst(ownerPath, rootDirectory), exportName) : [];
}

export function hasJsxAttribute(nodes: readonly ts.Node[], name: string, value?: string) {
  return someSourceNode(nodes, (node) => {
    if (!ts.isJsxAttribute(node) || node.name.getText() !== name) return false;
    if (value === undefined) return true;
    return Boolean(node.initializer && (ts.isStringLiteral(node.initializer) ? node.initializer.text === value
      : ts.isJsxExpression(node.initializer) && sourceExpressionIs(node.initializer.expression, value)));
  });
}

export function hasRenderedExpression(nodes: readonly ts.Node[], expression: string) {
  return someSourceNode(nodes, (node) => ts.isJsxExpression(node) && someSourceNode(node.expression, (child) => sourceExpressionIs(child, expression)));
}

export function hasReturnedProperty(source: ts.SourceFile, functionName: string, propertyName: string, expression: string) {
  const owner = findSourceFunction(source, functionName);
  return someSourceNode(owner?.body, (node) => {
    if (!ts.isReturnStatement(node) || !node.expression || !ts.isObjectLiteralExpression(node.expression)) return false;
    return node.expression.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === propertyName
      && sourceExpressionIs(property.initializer, expression));
  });
}

export function getReturnedLiteralRecord(source: ts.SourceFile, functionName: string, key: string, value: string) {
  let found: ts.ObjectLiteralExpression | undefined;
  someSourceNode(findSourceFunction(source, functionName)?.body, (node) => {
    if (ts.isReturnStatement(node) && node.expression && ts.isArrayLiteralExpression(node.expression)) {
      found = node.expression.elements.find((element): element is ts.ObjectLiteralExpression => ts.isObjectLiteralExpression(element)
        && element.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === key
          && ts.isStringLiteral(property.initializer) && property.initializer.text === value));
    }
    return Boolean(found);
  });
  return found;
}

export function literalRecordProperty(record: ts.ObjectLiteralExpression | undefined, name: string) {
  const property = record?.properties.find((entry): entry is ts.PropertyAssignment => ts.isPropertyAssignment(entry) && entry.name.getText() === name);
  return property && ts.isStringLiteral(property.initializer) ? property.initializer.text : undefined;
}

export function readActiveEngagementCalibration() {
  const calibrationAst = readSourceAst("src/lib/behavioral/behavioral-math-calibration.ts");
  const scoreAst = readSourceAst("src/lib/behavioral/user-engagement-score.ts");
  const scoreFunction = findSourceFunction(scoreAst, "computeUserEngagementScore");
  const calibrationFunction = findSourceFunction(calibrationAst, "computeEngagementScoreFromSignals");
  const signalBindings: Record<string, [number, string]> = { meaningfulActionSignal: [0.1, "actionComponent"], unwrapSignal: [0.23, "unwrapComponent"], validWatchSignal: [0.23, "watchComponent"], purchaseSignal: [0.24, "purchaseComponent"], return7dSignal: [0.13, "returnComponent"], freeIntentSignal: [0.07, "freeIntentComponent"] };
  let weightOwner: ts.ObjectLiteralExpression | undefined;
  someSourceNode(calibrationAst, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "BEHAVIORAL_ENGAGEMENT_SIGNAL_WEIGHTS") {
      someSourceNode(node.initializer, (child) => { if (ts.isObjectLiteralExpression(child)) { weightOwner = child; return true; } return false; });
      return true;
    }
    return false;
  });
  const signals = Object.entries(signalBindings).map(([signal, [weight, component]]) => {
    const ownerWeight = weightOwner?.properties.find((property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && property.name.getText() === signal);
    const liveBinding = someSourceNode(scoreFunction?.body, (node) => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "computeEngagementScoreFromSignals"
      && node.arguments.some((argument) => ts.isObjectLiteralExpression(argument) && argument.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === signal && sourceExpressionIs(property.initializer, "breakdown." + component))));
    const pass = Boolean(ownerWeight && ts.isNumericLiteral(ownerWeight.initializer) && Number(ownerWeight.initializer.text) === weight && liveBinding
      && someSourceNode(calibrationFunction?.body, (node) => sourceExpressionIs(node, "BEHAVIORAL_ENGAGEMENT_SIGNAL_WEIGHTS." + signal + " * clamp01(input." + signal + ")")));
    return { signal, pass };
  });
  const usesCanonicalOwner = someSourceNode(scoreAst, (node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== "@/lib/behavioral/behavioral-math-calibration") return false;
    const bindings = node.importClause?.namedBindings;
    return Boolean(bindings && ts.isNamedImports(bindings) && bindings.elements.some((element) => element.name.text === "computeEngagementScoreFromSignals"));
  });
  return { signals, usesCanonicalOwner };
}

export function readBehavioralAdminConsumers() {
const usersAst = readSourceAst("src/app/admin/users/page.tsx");
const usersFunction = findSourceFunction(usersAst, "default");
const usersRender = sourceRenderNodes(usersAst);
const directoryRender = readRenderedOwner("src/app/admin/users/page.tsx", "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx", "AdminUserDirectory");
const detailAst = readSourceAst("src/app/admin/user/[userId]/page.tsx");
const detailFunction = findSourceFunction(detailAst, "default");
const detailRender = sourceRenderNodes(detailAst);
const verdictRender = readRenderedOwner("src/app/admin/user/[userId]/page.tsx", "src/components/Admin/BehavioralVerdictCard.tsx", "BehavioralVerdictCard");
const explanationAst = readSourceAst("src/lib/behavioral/behavioral-explanation.ts");
const hasDirectoryVerdict = (kind: "engagement" | "value") => hasSourceCall(usersFunction?.body, kind === "engagement" ? "buildEngagementBehavioralExplanation" : "buildValueBehavioralExplanation")
  && someSourceNode(usersFunction?.body, node => ts.isPropertyAssignment(node) && node.name.getText() === kind && sourceExpressionIs(node.initializer, kind + "Explanation.verdict"))
  && hasJsxAttribute(usersRender, "records", "adminDirectoryRecords")
  && hasRenderedExpression(directoryRender, "behavior." + kind);
const hasDetailVerdict = (kind: "engagement" | "value") => hasSourceCall(detailFunction?.body, kind === "engagement" ? "buildEngagementBehavioralExplanation" : "buildValueBehavioralExplanation")
  && hasJsxAttribute(detailRender, "explanation", kind + "Explanation")
  && hasRenderedExpression(verdictRender, "explanation.verdict");
const hasDetailReasons = (kind: "engagement" | "value") => hasReturnedProperty(explanationAst, kind === "engagement" ? "buildEngagementBehavioralExplanation" : "buildValueBehavioralExplanation", "reasons", "input." + kind + ".topReasons.slice(0, 3).map((reason) => reason.summary)")
  && hasRenderedExpression(verdictRender, "explanation.reasons.slice(0, 3)");


let directoryMapper: ts.FunctionLikeDeclaration | undefined;
someSourceNode(usersFunction?.body, (node) => {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== "adminDirectoryRecords" || !node.initializer || !ts.isCallExpression(node.initializer)) return false;
  const mapper = node.initializer.arguments[0];
  if (mapper && (ts.isArrowFunction(mapper) || ts.isFunctionExpression(mapper))) directoryMapper = mapper;
  return Boolean(directoryMapper);
});
let directoryBehavior: ts.ObjectLiteralExpression | undefined;
someSourceNode(directoryMapper?.body, (node) => {
  if (!ts.isReturnStatement(node) || !node.expression || !ts.isObjectLiteralExpression(node.expression)) return false;
  const behavior = node.expression.properties.find((property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && property.name.getText() === "behavior");
  if (behavior && ts.isObjectLiteralExpression(behavior.initializer)) directoryBehavior = behavior.initializer;
  return Boolean(directoryBehavior);
});
const hasDirectoryBinding = (name: string, expression: string) => Boolean(directoryBehavior?.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === name && sourceExpressionIs(property.initializer, expression)));
const hasDirectoryReason = (kind: "engagement" | "value") => hasDirectoryVerdict(kind)
  && hasDirectoryBinding(kind + "Reason", kind + "Explanation.reasons[0] ?? " + kind + "Explanation.summary")
  && hasRenderedExpression(directoryRender, "behavior." + kind + "Reason");
const hasDirectoryMathState = () => hasDirectoryBinding("mathMode", 'behaviorRollup?.mathCalibration?.activeMode ?? "unavailable"')
  && hasDirectoryBinding("mathVerdict", 'behaviorRollup?.mathCalibration?.verdict ?? "unavailable"')
  && hasJsxAttribute(directoryRender, "data-user-behavior-math-mode", "behavior.mathMode")
  && hasRenderedExpression(directoryRender, "behavior.mathMode")
  && hasRenderedExpression(directoryRender, "behavior.mathVerdict");

  return { usersRender, hasDirectoryVerdict, hasDirectoryReason, hasDirectoryMathState, hasDetailVerdict, hasDetailReasons, verdictRender, explanationAst };
}

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
const confidenceHelper = read("src/lib/behavioral/behavioral-confidence.ts");
const truthHelper = read("src/lib/behavioral/behavioral-truth-source.ts");
const snapshotContract = read("src/lib/admin-user-metrics-contract.ts");
const snapshotHelper = read("src/lib/server/admin-user-metrics-snapshot.ts");
const rollupContract = read("src/lib/user-behavior-rollup-contract.ts");
const rollupHelper = read("src/lib/server/user-behavior-rollup.ts");
const overviewRoute = read("src/app/api/admin/overview/route.ts");
const usersRoute = read("src/app/api/admin/users/route.ts");
const userDetailRoute = read("src/app/api/admin/user/[userId]/route.ts");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const behaviorRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const behaviorTruthDoc = read("docs/agent-truth/behavioral-truth-source.md");
const watchTruthDoc = read("docs/agent-truth/watch-time-truth.md");
const audienceSnapshotDoc = read("docs/agent-truth/admin-analytics-audience-snapshot.md");

const failures: string[] = [];
const pageRender = sourceRenderNodes(readSourceAst("src/app/admin/users/page.tsx"));
const metricRender = readRenderedOwner("src/app/admin/users/page.tsx", "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx", "AdminUserMetricCard");

[
  "admin_metrics: 5 * 60 * 1000",
  "user_detail_behavior: 30 * 60 * 1000",
  "recommendation_profile: 24 * 60 * 60 * 1000",
  "strategic_analytics: 72 * 60 * 60 * 1000",
].forEach((entry) => {
  assert(truthHelper.includes(entry), `Behavioral truth helper missing freshness threshold ${entry}.`, failures);
});

[
  "(0.35 * sourceAgreement)",
  "(0.25 * freshnessScore)",
  "(0.25 * sampleScore)",
  "(0.15 * schemaScore)",
  "issuePenalty = Math.min(0.6, Math.max(0, input.issueCount) * 0.12)",
  'if (score >= 90) return "verified"',
  'if (score >= 75) return "strong"',
  'if (score >= 50) return "usable"',
  'if (score >= 30) return "low"',
].forEach((fragment) => {
  assert(confidenceHelper.includes(fragment), `Behavioral confidence helper missing ${fragment}.`, failures);
});

[
  '"materialized_rollup"',
  '"event_facts"',
  '"user_profile_fields"',
  '"live_fallback"',
  '"legacy_fallback"',
].forEach((fragment) => {
  assert(truthHelper.includes(fragment), `Behavioral truth helper missing source hierarchy member ${fragment}.`, failures);
});
assert(truthHelper.includes('"privacy_limited"'), "Behavioral truth helper must expose the privacy_limited freshness state.", failures);
assert(truthHelper.includes("dataAvailabilityReason"), "Behavioral truth helper must carry dataAvailabilityReason.", failures);

assert(snapshotContract.includes("truthSource"), "Admin user metrics snapshot contract must carry truthSource.", failures);
assert(snapshotContract.includes("confidenceScore"), "Admin user metrics snapshot contract must carry confidenceScore.", failures);
assert(snapshotContract.includes("confidenceLabel"), "Admin user metrics snapshot contract must carry confidenceLabel.", failures);
assert(snapshotContract.includes("issues"), "Admin user metrics snapshot contract must carry issues.", failures);
assert(snapshotHelper.includes("buildBehavioralTruthSummary"), "Admin user metrics snapshot helper must use behavioral truth summary.", failures);
assert(
  overviewRoute.includes("ADMIN_USERS_SNAPSHOT_ID")
    && overviewRoute.includes("readCachedUserTruthSnapshot")
    && !overviewRoute.includes("readAdminUserMetricsSnapshot")
    && !overviewRoute.includes("readAdminUserTruthSnapshot"),
  "Admin overview must keep reading the canonical user metrics/truth snapshot from the hot-cache document.",
  failures,
);
assert(usersRoute.includes("buildAdminUserMetricsSnapshot"), "Admin users route must use the canonical user metrics snapshot builder.", failures);
assert(!usersRoute.includes("resolveSnapshotFreshness("), "Admin users route must not keep a local snapshot freshness fork.", failures);

assert(rollupContract.includes("confidenceScore"), "User behavior rollup contract must carry confidenceScore.", failures);
assert(rollupContract.includes("sourceLabel"), "User behavior rollup contract must carry sourceLabel.", failures);
assert(rollupContract.includes("freshnessState"), "User behavior rollup contract must carry freshnessState.", failures);
assert(rollupContract.includes("dataAvailabilityReason"), "User behavior rollup contract must carry dataAvailabilityReason.", failures);
assert(rollupHelper.includes("buildBehavioralTruthSummary"), "User behavior rollup helper must use behavioral truth summary.", failures);
assert(rollupHelper.includes("privacy_limited_identified_analytics_denied"), "User behavior rollup helper must classify consent-denied analytics as privacy-limited.", failures);
assert(usersRoute.includes("buildUserBehaviorRollup"), "Admin users route must build canonical user behavior rollups.", failures);
assert(userDetailRoute.includes("buildUserBehaviorRollup"), "Admin user detail route must build canonical user behavior rollups.", failures);

assert(hasJsxAttribute(pageRender, "data-admin-users-stats-layout", "evidence-ribbon"), "User Management must keep its active compact evidence ribbon marker.", failures);
assert(!usersPage.includes('value: summary ? `${summary.totalWatchHours ?? 0}h` : "[unavailable]"'), "Watch summary card must not render [unavailable] as a primary value.", failures);
assert(
  usersPage.includes("No summary signal yet")
    || usersPage.includes("Unavailable")
    || hasJsxAttribute(metricRender, "data-admin-users-metric-state", "state"),
  "User Management summary cards must keep a compact non-zero-truth placeholder instead of forcing [unavailable] as a primary value.",
  failures,
);
assert(hasJsxAttribute(metricRender, "data-admin-users-metric-state", "state") && hasJsxAttribute(pageRender, "state", "metricState"), "The rendered User Management metric owner must bind its actual metric state.", failures);
assert(hasJsxAttribute(metricRender, "data-admin-users-metric-source", "source") && hasJsxAttribute(pageRender, "source", "card.sourceLabel ?? card.sourceTruth"), "The rendered User Management metric owner must bind its actual metric source.", failures);

assert(rollupHelper.includes("watch_time_missing_despite_views"), "Behavior rollup helper must flag watch_time_missing_despite_views.", failures);
assert(rollupHelper.includes('"legacy_page_duration"'), "Behavior rollup helper must keep labeled legacy page-duration fallback evidence.", failures);
assert(behaviorRuntime.includes('const STALE_AFTER_MS = 24 * 60 * 60 * 1000'), "Behavioral intelligence runtime must use 24h recommendation freshness.", failures);
assert(behaviorRuntime.includes("computeBehavioralTruthConfidence"), "Behavioral intelligence runtime must mirror the canonical confidence helper.", failures);
assert(behaviorRuntime.includes("(0.35 * sourceAgreement)"), "Behavioral intelligence runtime must keep the canonical source-agreement weight.", failures);
assert(behaviorRuntime.includes("confidenceLabelForScore(confidenceScore)"), "Behavioral intelligence runtime must use the canonical confidence label mapping after privacy caps.", failures);
assert(behaviorRuntime.includes("privacy_limited_identified_analytics_denied"), "Behavioral intelligence runtime must emit privacy-limited issue codes for consent-denied users.", failures);
assert(behaviorRuntime.includes("PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34"), "Behavioral intelligence runtime must declare the privacy-limited recommendation confidence cap.", failures);
assert(behaviorRuntime.includes("Math.min(confidenceResult.normalizedScore, PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP)"), "Behavioral intelligence runtime must cap recommendation confidence when identified analytics is denied.", failures);
assert(behaviorRuntime.includes("const confidenceLabel = confidenceLabelForScore(confidenceScore)"), "Behavioral intelligence runtime must label the capped recommendation confidence score.", failures);

assert(userDetailPage.includes("Insufficient signal"), "User detail must keep the compact insufficient-signal state.", failures);
assert(userDetailPage.includes("fallback recommendation"), "User detail must clearly label fallback recommendations.", failures);
assert(userDetailPage.includes("behaviorRollup?.freshnessState"), "User detail truth badge must use behavior rollup freshness.", failures);

assert(!usersPage.includes("setInterval("), "User Management must not add polling via setInterval.", failures);
assert(!userDetailPage.includes("setInterval("), "Admin user detail must not add polling via setInterval.", failures);
assert(usersPage.includes('authFetch("/api/admin/users?mode=summary")'), "The primary summary snapshot lane must stay separate from list/detail loads.", failures);

assert(behaviorTruthDoc.includes("materialized_rollup"), "Behavioral truth doc must describe the canonical source hierarchy.", failures);
assert(behaviorTruthDoc.includes("0.35 * sourceAgreement"), "Behavioral truth doc must explain the confidence formula.", failures);
assert(watchTruthDoc.includes("watch-session rollups count as `event_facts`"), "Watch time doc must anchor watch sessions in the behavioral truth hierarchy.", failures);
assert(audienceSnapshotDoc.includes("Behavioral audience cards also inherit the canonical behavioral truth hierarchy"), "Audience snapshot doc must mention the shared behavioral hierarchy.", failures);

if (failures.length > 0) {
  console.error("Behavioral truth source validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Behavioral truth source validation passed.");

}

if (require.main === module) main();
