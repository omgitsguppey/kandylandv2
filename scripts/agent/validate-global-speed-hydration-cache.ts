import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

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

function hasConnectedDropsParallelSeed(routeSource: string, loaderSource: string) {
  const route = ts.createSourceFile("DropsPage.tsx", routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const loader = ts.createSourceFile("public-discovery-preview.ts", loaderSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const unwrap = (node: ts.Expression): ts.Expression => ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
    ? unwrap(node.expression) : node;
  const identifier = (node: ts.Node | undefined) => node && ts.isIdentifier(node) ? node.text : null;
  const importedName = (tree: ts.SourceFile, moduleName: string, exportedName: string) => {
    for (const node of tree.statements) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== moduleName) continue;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) return bindings.elements.find(item => (item.propertyName ?? item.name).text === exportedName)?.name.text ?? null;
    }
    return null;
  };
  const firstReturn = (node: ts.FunctionDeclaration) => node.body?.statements.find(statement => ts.isReturnStatement(statement));
  const declarations = (node: ts.FunctionDeclaration) => (node.body?.statements ?? [])
    .filter(statement => !firstReturn(node) || statement.getStart() < firstReturn(node)!.getStart())
    .flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []);
  const awaitedCall = (node: ts.Expression | undefined) => {
    if (!node || !ts.isAwaitExpression(unwrap(node))) return null;
    const awaited = unwrap(node) as ts.AwaitExpression;
    const call = unwrap(awaited.expression);
    return ts.isCallExpression(call) ? call : null;
  };
  const parallelElements = (node: ts.Expression | undefined) => {
    const call = awaitedCall(node);
    if (!call || !ts.isPropertyAccessExpression(call.expression) || identifier(call.expression.expression) !== "Promise" || call.expression.name.text !== "all" || call.arguments.length !== 1) return null;
    const array = unwrap(call.arguments[0]);
    return ts.isArrayLiteralExpression(array) && array.elements.length === 2 ? array.elements : null;
  };
  const objectBindingName = (binding: ts.BindingName, key: string) => ts.isObjectBindingPattern(binding)
    ? identifier(binding.elements.find(item => !item.dotDotDotToken && (item.propertyName ?? item.name).getText().replaceAll('"', "") === key)?.name) : null;
  const returnedProperty = (node: ts.Expression, key: string) => {
    const object = unwrap(node);
    if (!ts.isObjectLiteralExpression(object)) return null;
    const property = object.properties.find(item => (ts.isPropertyAssignment(item) || ts.isShorthandPropertyAssignment(item)) && item.name.getText().replaceAll('"', "") === key);
    return property && ts.isPropertyAssignment(property) ? identifier(unwrap(property.initializer)) : property && ts.isShorthandPropertyAssignment(property) ? property.name.text : null;
  };
  const routeFunction = route.statements.find(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword));
  const loadName = importedName(route, "@/lib/server/public-discovery-preview", "getPublicDiscoveryData");
  const clientName = importedName(route, "./DropsClient", "DropsClient");
  if (!routeFunction || !ts.isFunctionDeclaration(routeFunction) || !loadName || !clientName) return false;
  const routeDeclarations = declarations(routeFunction);
  const seed = routeDeclarations.find(node => {
    const call = awaitedCall(node.initializer);
    return call && identifier(call.expression) === loadName && call.arguments.length === 1 && ts.isStringLiteral(call.arguments[0]) && call.arguments[0].text === "drops";
  });
  if (!seed) return false;
  const dropsSeedName = objectBindingName(seed.name, "drops");
  const creatorsSeedName = objectBindingName(seed.name, "creatorProfiles");
  if (!dropsSeedName || !creatorsSeedName) return false;
  const isActiveDrops = (expression: ts.Expression, visited = new Set<string>()): boolean => {
    const node = unwrap(expression);
    if (ts.isIdentifier(node)) {
      if (visited.has(node.text)) return false;
      visited.add(node.text);
      const declaration = routeDeclarations.find(item => identifier(item.name) === node.text);
      return Boolean(declaration?.initializer && isActiveDrops(declaration.initializer, visited));
    }
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || identifier(node.expression.expression) !== dropsSeedName || node.expression.name.text !== "filter" || node.arguments.length !== 1) return false;
    const callback = node.arguments[0];
    if (!ts.isArrowFunction(callback) || callback.parameters.length !== 1 || !ts.isExpression(callback.body)) return false;
    const condition = unwrap(callback.body);
    if (!ts.isBinaryExpression(condition) || condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
    const property = unwrap(condition.left), value = unwrap(condition.right);
    return ts.isPropertyAccessExpression(property) && identifier(property.expression) === identifier(callback.parameters[0].name) && property.name.text === "status" && ts.isStringLiteral(value) && value.text === "active";
  };
  let connectedClient = false;
  for (const statement of [firstReturn(routeFunction)]) {
    if (!statement) continue;
    if (!ts.isReturnStatement(statement) || !statement.expression) continue;
    const visit = (node: ts.Node) => {
      if (ts.isFunctionLike(node)) return;
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(route) === clientName) {
        const prop = (name: string) => {
          const item = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(route) === name);
          return item && ts.isJsxAttribute(item) && item.initializer && ts.isJsxExpression(item.initializer) ? item.initializer.expression : undefined;
        };
        const drops = prop("initialDrops"), creators = prop("creatorRailProfiles");
        connectedClient ||= Boolean(drops && isActiveDrops(drops) && creators && identifier(unwrap(creators)) === creatorsSeedName);
      }
      ts.forEachChild(node, visit);
    };
    visit(statement.expression);
  }
  if (!connectedClient) return false;
  const loadFunction = loader.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getPublicDiscoveryData" && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  if (!loadFunction || !ts.isFunctionDeclaration(loadFunction)) return false;
  const surfaceName = identifier(loadFunction.parameters[0]?.name);
  if (!surfaceName) return false;
  const loaderDeclarations = declarations(loadFunction);
  const serviceNames = new Map<string, { name: string; position: number }>();
  for (const declaration of loaderDeclarations) {
    const items = parallelElements(declaration.initializer);
    if (!items || !ts.isArrayBindingPattern(declaration.name) || declaration.name.elements.length !== 2) continue;
    items.forEach((item, index) => {
      const call = unwrap(item);
      const binding = declaration.name as ts.ArrayBindingPattern;
      const element = binding.elements[index];
      if (!ts.isCallExpression(call) || call.expression.kind !== ts.SyntaxKind.ImportKeyword || call.arguments.length !== 1 || !ts.isStringLiteral(call.arguments[0]) || !ts.isBindingElement(element)) return;
      const moduleName = call.arguments[0].text;
      const exported = moduleName === "@/lib/server/drops" ? "getDrops" : moduleName === "@/lib/server/creator-discovery" ? "listCreatorDiscoveryProfiles" : null;
      const name = exported && objectBindingName(element.name, exported);
      if (name) serviceNames.set(exported!, { name, position: declaration.getStart() });
    });
  }
  const dropService = serviceNames.get("getDrops"), creatorService = serviceNames.get("listCreatorDiscoveryProfiles");
  if (!dropService || !creatorService) return false;
  for (const declaration of loaderDeclarations) {
    const items = parallelElements(declaration.initializer);
    if (!items || !ts.isArrayBindingPattern(declaration.name) || dropService.position >= declaration.getStart() || creatorService.position >= declaration.getStart()) continue;
    let dropResult: string | null = null, creatorResult: string | null = null;
    items.forEach((item, index) => {
      const call = unwrap(item), binding = (declaration.name as ts.ArrayBindingPattern).elements[index];
      if (!ts.isCallExpression(call) || !ts.isBindingElement(binding)) return;
      const name = identifier(call.expression), result = identifier(binding.name);
      if (name === dropService.name && call.arguments.length === 0) dropResult = result;
      if (name === creatorService.name && call.arguments.length === 1 && identifier(unwrap(call.arguments[0])) === surfaceName) creatorResult = result;
    });
    if (!dropResult || !creatorResult) continue;
    const statement = firstReturn(loadFunction);
    const returned = statement && ts.isReturnStatement(statement) && statement.expression
      && returnedProperty(statement.expression, "drops") === dropResult && returnedProperty(statement.expression, "creatorProfiles") === creatorResult;
    if (returned) return true;
  }
  return false;
}

const audit = readRequired("agent/state/global-speed-hydration-cache-audit.generated.json");
const globalLoadingDoc = readRequired("docs/agent-truth/global-loading-performance.md");
const refreshDoc = readRequired("docs/agent-truth/refresh-based-hot-cache.md");
const routeCache = readRequired("src/lib/server/ephemeral-route-cache.ts");
const refreshContract = readRequired("src/lib/runtime/cache/refresh-cache-contract.ts");
const userActivityRoute = readRequired("src/app/api/user/activity/route.ts");
const recentActivityFeed = readRequired("src/components/Dashboard/RecentActivityFeed.tsx");
const dashboardPage = readRequired("src/app/dashboard/page.tsx");
const dropsPage = readRequired("src/app/drops/page.tsx");
const publicDiscoveryLoader = readRequired("src/lib/server/public-discovery-preview.ts");
const experiencesPage = readRequired("src/app/experiences/page.tsx");
const useDrops = readRequired("src/hooks/useDrops.ts");
const useNotifications = readRequired("src/hooks/useNotifications.ts");
const notificationRoute = readRequired("src/app/api/notifications/route.ts");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const mobileShell = readRequired("src/lib/user-mobile-shell.ts");
const packageJson = readRequired("package.json");

for (const routeKey of [
  "\"admin.analytics\"",
  "\"admin.overview\"",
  "\"user.dashboard\"",
  "\"drops.page\"",
  "\"wallet.packages\"",
  "\"chat.messages\"",
  "\"experiences.page\"",
  "\"notifications\"",
  "\"app.shell\"",
  "\"api.user.activity\"",
  "\"service-worker\"",
]) {
  requireIncludes(audit, routeKey, "Global speed hydration cache audit");
}

for (const auditNeedle of [
  "\"blocksOnRealtime\"",
  "\"blocksOnRefresh\"",
  "\"blocksOnTimeLimitExpiration\"",
  "\"clearsDataOnRefresh\"",
  "\"clearsDataOnStale\"",
  "\"genericWaitingRisk\"",
  "\"fakeZeroRisk\"",
  "\"usesRouterRefreshAsInvalidation\"",
  "\"privatePublicCacheMode\"",
  "\"fixed\"",
]) {
  requireIncludes(audit, auditNeedle, "Global speed hydration cache audit");
}

for (const doctrineNeedle of [
  "Age changes the label, not the existence of the data",
  "Verified data stays visible until replaced",
  "refresh failure keeps the previous verified payload visible",
  "One slow module cannot block unrelated modules",
  "Waiting must say why",
  "Private/admin data must not be publicly CDN cached",
]) {
  requireIncludes(globalLoadingDoc + refreshDoc, doctrineNeedle, "Global refresh doctrine docs");
}

requireIncludes(refreshContract, "dedupeRefresh", "Refresh cache contract");
requireIncludes(refreshContract, "markRefreshFailed", "Refresh cache contract");
requireIncludes(routeCache, "staleInflightLoads", "Route cache refresh dedupe");
requireIncludes(routeCache, "staleButVerified: true", "Route cache stale display preservation");
requireIncludes(routeCache, "retainedBeyondStaleTtl", "Route cache time-age display preservation");

requireIncludes(userActivityRoute, "readThroughStaleWhileRevalidateEphemeralRouteCache", "User activity route cache policy");
requireIncludes(userActivityRoute, "USER_ACTIVITY_CACHE_STALE_TTL_MS", "User activity route stale policy");
requireIncludes(userActivityRoute, "staleButVerified", "User activity route metadata");
requireIncludes(userActivityRoute, "blocksOnTimeExpiry: false", "User activity route debug metadata");
requireIncludes(userActivityRoute, "PRIVATE_REVALIDATE_CACHE_CONTROL", "User activity route private cache-control");
requireIncludes(userActivityRoute, "Promise.all", "User activity route parallel fetch");
requireNotIncludes(userActivityRoute, "import { readThroughEphemeralRouteCache", "User activity route display cache");

requireIncludes(recentActivityFeed, "summaryInFlightRef", "Recent activity refresh dedupe");
requireIncludes(recentActivityFeed, "historyInFlightRef", "Recent activity refresh dedupe");
requireIncludes(recentActivityFeed, "loadingHistory && !historyActivities.length", "Recent activity preserves history while refreshing");
requireIncludes(dashboardPage, "Promise.all", "Dashboard initial server fetches");
if (!hasConnectedDropsParallelSeed(dropsPage, publicDiscoveryLoader)) {
  failures.push("Drops initial server seed must connect its canonical loader to both parallel service reads and the returned DropsClient values.");
}
requireIncludes(experiencesPage, "Promise.all", "Experiences initial server fetches");
requireIncludes(useDrops, "fallbackData", "Drops server-seeded first render");
requireIncludes(useDrops, "refreshDrops(isConstrained ? 6_000 : 1_500)", "Drops refresh storm throttle");
requireIncludes(useDrops, "revalidateOnMount: !hasServerSeed", "Drops avoids duplicate first refresh");
requireIncludes(useNotifications, "consecutiveFailuresRef", "Notifications failure does not blank state");
requireIncludes(useNotifications, "setLoadError(message)", "Notifications exposes failure reason");
requireIncludes(notificationRoute, "PRIVATE_REVALIDATE_CACHE_CONTROL", "Notifications route private cache-control");
requireIncludes(chatExperience, "background?: boolean", "Chat background refresh contract");
requireIncludes(chatExperience, "keepCurrentDetailVisible", "Chat keeps matching thread detail during refresh");
requireIncludes(chatExperience, "Promise.allSettled", "Chat partial bulk write behavior");
requireIncludes(mobileShell, "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT", "Mobile safe-area contract");
requireIncludes(packageJson, "check:global-speed-hydration-cache", "Package scripts");

for (const scopedSource of [
  userActivityRoute,
  recentActivityFeed,
  useDrops,
  useNotifications,
  chatExperience,
].join("\n").split("\n")) {
  if (scopedSource.includes("Waiting for analytics") || scopedSource.includes("Waiting\"")) {
    failures.push("Scoped user/admin loading code must not include generic Waiting copy.");
    break;
  }
}

if (failures.length > 0) {
  console.error("Global speed hydration cache validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Global speed hydration cache validation passed.");
