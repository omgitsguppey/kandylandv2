import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { findSourceFunction, hasJsxAttribute, readSourceAst, someSourceNode, sourceExpressionIs, sourceRenderNodes } from "./validate-behavioral-truth-source";
import { buildTelemetryEventPayloadContract } from "../../src/lib/telemetry-catalog";

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

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const discoveryTelemetry = readRequired("src/lib/discovery-telemetry.ts");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropImpressionHook = readRequired("src/hooks/useDropCardImpression.ts");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const creatorRail = readRequired("src/components/CreatorDiscoveryRail.tsx");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const telemetrySafety = readRequired("src/lib/analytics/telemetry-safety.ts");
const behavioralNormalizer = readRequired("src/lib/behavioral/normalize-event-fact.ts");
const telemetryContracts = readRequired("tests/contracts/telemetry-contracts.spec.ts");
const discoveryTests = readRequired("tests/unit/discovery-telemetry.spec.ts");

if (packageJson.scripts?.["check:discovery-tracking-truth"] !== "tsx scripts/agent/validate-discovery-tracking-truth.ts") {
  failures.push("package.json must expose check:discovery-tracking-truth.");
}

requireIncludes(discoveryTelemetry, "DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD = 0.6", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "sanitizeDiscoveryQuery", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "buildDiscoveryImpressionKey", "Discovery telemetry helper");
requireIncludes(discoveryTelemetry, "[redacted_email]", "Discovery telemetry helper query sanitizer");
requireIncludes(discoveryTelemetry, "[redacted_phone]", "Discovery telemetry helper query sanitizer");

requireIncludes(dropImpressionHook, "IntersectionObserver", "Drop card impression hook");
requireIncludes(dropImpressionHook, "DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD", "Drop card impression hook");
requireIncludes(dropImpressionHook, "buildDiscoveryImpressionKey", "Drop card impression hook");
requireIncludes(dropImpressionHook, 'trackEvent("drop_card_impression"', "Drop card impression hook");
requireIncludes(dropImpressionHook, "impression_session_id", "Drop card impression hook");
requireIncludes(dropImpressionHook, "surface: impressionTrackingSurface", "Drop card impression hook");
requireIncludes(dropImpressionHook, "position: impressionTrackingPosition", "Drop card impression hook");
requireIncludes(dropCard, "impressionTrackingPosition", "DropCard");
requireIncludes(dropGrid, "impressionTrackingPosition={index + 1}", "DropGrid");

function importedName(source: ts.SourceFile, moduleName: string, exportedName: string) {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) return bindings.elements.find((entry) =>
      (entry.propertyName?.text ?? entry.name.text) === exportedName)?.name.text;
  }
}

function activeCallbackCalls(body: ts.ConciseBody | undefined) {
  const calls: ts.CallExpression[] = [];
  if (!body) return calls;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);
  return calls;
}
function bindingLocalName(pattern: ts.BindingName | undefined, property: string) {
  if (!pattern || !ts.isObjectBindingPattern(pattern)) return undefined;
  const entry = pattern.elements.find((entry) => (entry.propertyName?.getText() ?? entry.name.getText()) === property);
  return entry && ts.isIdentifier(entry.name) ? entry.name.text : undefined;
}
function objectField(object: ts.ObjectLiteralExpression | undefined, field: string) {
  const property = object?.properties.find((entry) => (ts.isPropertyAssignment(entry) || ts.isShorthandPropertyAssignment(entry))
    && (ts.isStringLiteral(entry.name) ? entry.name.text : entry.name.getText()) === field);
  return property && (ts.isPropertyAssignment(property) ? property.initializer : ts.isShorthandPropertyAssignment(property) ? property.name : undefined);
}

const clientAst = readSourceAst("src/app/drops/DropsClient.tsx");
const clientOwner = findSourceFunction(clientAst, "DropsClient");
const hookName = importedName(clientAst, "@/hooks/useDropsSearchTelemetry", "useDropsSearchTelemetry");
const declarations = clientOwner?.body && ts.isBlock(clientOwner.body) ? clientOwner.body.statements.flatMap((statement) =>
  ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []) : [];
const hookBinding = declarations.find((declaration) => ts.isObjectBindingPattern(declaration.name) && declaration.initializer
  && ts.isCallExpression(declaration.initializer) && ts.isIdentifier(declaration.initializer.expression)
  && declaration.initializer.expression.text === hookName && declaration.initializer.arguments.length === 1
  && ts.isObjectLiteralExpression(declaration.initializer.arguments[0])
  && ["deferredSearchQuery", "filteredDrops", "selectedCategory"].every((name) =>
    declaration.initializer && ts.isCallExpression(declaration.initializer) && ts.isObjectLiteralExpression(declaration.initializer.arguments[0])
    && declaration.initializer.arguments[0].properties.some((entry) => ts.isShorthandPropertyAssignment(entry) ? entry.name.text === name
      : ts.isPropertyAssignment(entry) && entry.name.getText() === name && sourceExpressionIs(entry.initializer, name))));
const callbackName = (name: string) => hookBinding && ts.isObjectBindingPattern(hookBinding.name)
  ? hookBinding.name.elements.find((entry) => (entry.propertyName?.getText() ?? entry.name.getText()) === name)?.name.getText() : undefined;
const renderedClient = sourceRenderNodes(clientAst, "DropsClient");
const categoryCallback = callbackName("trackCategorySelected"), focusCallback = callbackName("trackSearchFocus"), resultCallback = callbackName("trackSearchResultClicked");
const callbackHookName = importedName(clientAst, "react", "useCallback");
const boundCallback = (name: string) => {
  const initializer = declarations.find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name)?.initializer;
  return initializer && ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression)
    && initializer.expression.text === callbackHookName && initializer.arguments[0] && ts.isArrowFunction(initializer.arguments[0])
    ? initializer.arguments[0] : findSourceFunction(clientAst, name);
};
const categoryHandler = boundCallback("handleSelectCategory"), selectHandler = boundCallback("handleSelectDrop");
const callbacksConnected = Boolean(hookBinding && categoryCallback && focusCallback && resultCallback
  && hasJsxAttribute(renderedClient, "onSelectCategory", "handleSelectCategory") && hasJsxAttribute(renderedClient, "onSearchFocus", focusCallback)
  && hasJsxAttribute(renderedClient, "onSelectDrop", "handleSelectDrop")
  && categoryHandler?.parameters[0] && ts.isIdentifier(categoryHandler.parameters[0].name)
  && activeCallbackCalls(categoryHandler.body).some((node) => ts.isIdentifier(node.expression) && node.expression.text === categoryCallback
    && node.arguments.length === 1 && sourceExpressionIs(node.arguments[0], categoryHandler.parameters[0].name.getText()))
  && selectHandler?.parameters[0] && ts.isIdentifier(selectHandler.parameters[0].name)
  && selectHandler.parameters[1] && ts.isIdentifier(selectHandler.parameters[1].name)
  && activeCallbackCalls(selectHandler.body).some((node) => ts.isIdentifier(node.expression) && node.expression.text === resultCallback
    && node.arguments.length === 2 && sourceExpressionIs(node.arguments[0], selectHandler.parameters[0].name.getText() + ".id")
    && sourceExpressionIs(node.arguments[1], selectHandler.parameters[1].name.getText())));
if (!callbacksConnected) failures.push("Drops discovery must consume its imported search hook and rendered category/focus/result callbacks.");
const hookAst = readSourceAst("src/hooks/useDropsSearchTelemetry.ts"), hookOwner = findSourceFunction(hookAst, "useDropsSearchTelemetry");
const trackName = importedName(hookAst, "@/lib/telemetry", "trackEvent"), builderName = importedName(hookAst, "@/lib/discovery/search-telemetry-contract", "buildSearchTelemetryPayload");
const sanitizerName = importedName(hookAst, "@/lib/discovery-telemetry", "sanitizeDiscoveryQuery");
const hookStatements = hookOwner?.body && ts.isBlock(hookOwner.body) ? hookOwner.body.statements : [];
const effect = hookStatements.find((statement) => ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)
  && ts.isIdentifier(statement.expression.expression) && statement.expression.expression.text === "useEffect");
const effectBody = effect && ts.isExpressionStatement(effect) && ts.isCallExpression(effect.expression) ? effect.expression.arguments[0] : undefined;
const effectDeclarations: ts.VariableDeclaration[] = [];
someSourceNode(effectBody, (node) => { if (ts.isVariableDeclaration(node)) effectDeclarations.push(node); return false; });
const sanitized = effectDeclarations.find((declaration) => ts.isIdentifier(declaration.name) && declaration.initializer
  && ts.isCallExpression(declaration.initializer) && ts.isIdentifier(declaration.initializer.expression) && declaration.initializer.expression.text === sanitizerName);
const common = effectDeclarations.find((declaration) => ts.isIdentifier(declaration.name) && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)
  && declaration.initializer.properties.some((entry) => ts.isPropertyAssignment(entry) && entry.name.getText() === "queryText"
    && sanitized && sourceExpressionIs(entry.initializer, sanitized.name.getText())));
const submissionConnected = common && someSourceNode(effectBody, (node) => ts.isCallExpression(node) && ts.isIdentifier(node.expression)
  && node.expression.text === trackName && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "search_submitted"
  && node.arguments[1] && ts.isCallExpression(node.arguments[1]) && ts.isIdentifier(node.arguments[1].expression) && node.arguments[1].expression.text === builderName
  && ts.isObjectLiteralExpression(node.arguments[1].arguments[0]) && node.arguments[1].arguments[0].properties.some((entry) =>
    ts.isSpreadAssignment(entry) && sourceExpressionIs(entry.expression, common.name.getText())));
if (!submissionConnected) failures.push("Drops search submission must consume its canonical sanitized redacted payload.");
const hookCallbackName = importedName(hookAst, "react", "useCallback");
const hookDeclarations = hookStatements.flatMap((statement) => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []);
const returnedCategory = hookStatements.flatMap((statement) =>
  ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression)
    ? [objectField(statement.expression, "trackCategorySelected")] : []).find(Boolean);
const categoryDeclaration = returnedCategory && ts.isIdentifier(returnedCategory) ? hookDeclarations.find((declaration) =>
  ts.isIdentifier(declaration.name) && declaration.name.text === returnedCategory.text) : undefined;
const categoryInitializer = categoryDeclaration?.initializer;
const categoryOwner = categoryInitializer && ts.isCallExpression(categoryInitializer) && ts.isIdentifier(categoryInitializer.expression)
  && categoryInitializer.expression.text === hookCallbackName && categoryInitializer.arguments[0]
  && (ts.isArrowFunction(categoryInitializer.arguments[0]) || ts.isFunctionExpression(categoryInitializer.arguments[0])) ? categoryInitializer.arguments[0] : undefined;
const categoryParameter = categoryOwner?.parameters[0] && ts.isIdentifier(categoryOwner.parameters[0].name) ? categoryOwner.parameters[0].name.text : undefined;
const hookInput = hookOwner?.parameters[0] && ts.isIdentifier(hookOwner.parameters[0].name) ? hookOwner.parameters[0].name.text : undefined;
const inputDeclaration = hookDeclarations.find((declaration) => hookInput && ts.isObjectBindingPattern(declaration.name)
  && sourceExpressionIs(declaration.initializer, hookInput));
const queryInput = bindingLocalName(inputDeclaration?.name, "deferredSearchQuery"), resultsInput = bindingLocalName(inputDeclaration?.name, "filteredDrops");
const categoryStatements = categoryOwner?.body && ts.isBlock(categoryOwner.body) ? categoryOwner.body.statements : [];
const safeFieldsDeclaration = categoryStatements.flatMap((statement) => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).find((declaration) => {
  const initializer = declaration.initializer;
  if (!ts.isObjectBindingPattern(declaration.name) || !initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression)
    || initializer.expression.text !== builderName || initializer.arguments.length !== 1 || !ts.isObjectLiteralExpression(initializer.arguments[0])) return false;
  const query = objectField(initializer.arguments[0], "queryText");
  return Boolean(queryInput && resultsInput && declaration.name.elements.some((entry) => entry.propertyName?.getText() === "event_name")
    && query && ts.isCallExpression(query) && ts.isIdentifier(query.expression) && query.expression.text === sanitizerName
    && query.arguments.length === 1 && sourceExpressionIs(query.arguments[0], queryInput)
    && sourceExpressionIs(objectField(initializer.arguments[0], "resultCount"), resultsInput + ".length"));
});
const safeFields = safeFieldsDeclaration && ts.isObjectBindingPattern(safeFieldsDeclaration.name)
  ? safeFieldsDeclaration.name.elements.find((entry) => entry.dotDotDotToken && ts.isIdentifier(entry.name))?.name.getText() : undefined;
const sortName = importedName(hookAst, "@/lib/discovery-telemetry", "resolveDropsDiscoverySort");
const categoryConnected = categoryParameter && safeFields && activeCallbackCalls(categoryOwner?.body).some((node) => {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== trackName || node.arguments.length !== 2
    || !ts.isStringLiteral(node.arguments[0]) || node.arguments[0].text !== "drops_category_selected" || !ts.isObjectLiteralExpression(node.arguments[1])) return false;
  const payload = node.arguments[1], sort = objectField(payload, "sort");
  return sourceExpressionIs(objectField(payload, "category"), categoryParameter)
    && sort && ts.isCallExpression(sort) && ts.isIdentifier(sort.expression) && sort.expression.text === sortName
    && sort.arguments.length === 1 && sourceExpressionIs(sort.arguments[0], categoryParameter)
    && payload.properties.some((entry) => ts.isSpreadAssignment(entry) && sourceExpressionIs(entry.expression, safeFields));
});
if (!categoryConnected) failures.push("Drops category telemetry must use its returned canonical callback, selected category and sanitized payload.");

requireIncludes(featuredCarousel, "isCarouselVisible", "Featured carousel viewport gating");
requireIncludes(featuredCarousel, 'trackEvent("featured_slide_viewed"', "Featured carousel view telemetry");
requireIncludes(featuredCarousel, 'trackEvent("featured_slide_clicked"', "Featured carousel click telemetry");
requireIncludes(featuredCarousel, "position", "Featured carousel position telemetry");
requireIncludes(featuredCarousel, "impression_session_id", "Featured carousel session telemetry");
requireIncludes(featuredCarousel, "buildDiscoveryImpressionKey", "Featured carousel dedupe");
requireExcludes(featuredCarousel, 'trackEvent("featured_drop_viewed"', "Featured carousel legacy view telemetry");
requireExcludes(featuredCarousel, 'trackEvent("featured_drop_clicked"', "Featured carousel legacy click telemetry");

requireIncludes(creatorRail, "IntersectionObserver", "Creator rail viewport gating");
requireIncludes(creatorRail, 'trackEvent("creator_rail_impression"', "Creator rail impression telemetry");
requireIncludes(creatorRail, "creator_id: creatorId", "Creator rail creator id telemetry");
requireIncludes(creatorRail, "target_creator_id: creatorId", "Creator rail target creator telemetry");
const railAst = readSourceAst("src/components/CreatorDiscoveryRail.tsx");
const creatorCardName = importedName(railAst, "@/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation", "KandyCreatorDiscoveryCard");
const railRender = sourceRenderNodes(railAst, "CreatorDiscoveryRail");
const cardConnected = creatorCardName && someSourceNode(railRender, (node) => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
  && ts.isIdentifier(node.tagName) && node.tagName.text === creatorCardName && hasJsxAttribute([node], "position", "index + 1"));
const cardAst = readSourceAst("src/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation.tsx");
const cardOwner = findSourceFunction(cardAst, "KandyCreatorDiscoveryCard"), cardRender = sourceRenderNodes(cardAst, "KandyCreatorDiscoveryCard");
const cardRefName = bindingLocalName(cardOwner?.parameters[0]?.name, "cardRef"), cardCreatorName = bindingLocalName(cardOwner?.parameters[0]?.name, "creator");
const cardPositionName = bindingLocalName(cardOwner?.parameters[0]?.name, "position");
const observedCardMarker = cardRefName && cardCreatorName && cardPositionName && someSourceNode(cardRender, (node) =>
  (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && hasJsxAttribute([node], "ref", cardRefName)
    && hasJsxAttribute([node], "data-creator-id", cardCreatorName + ".uid") && hasJsxAttribute([node], "data-creator-rail-position", cardPositionName));
if (!cardConnected || !observedCardMarker) failures.push("Creator rail position must reach its imported rendered card marker.");
requireIncludes(creatorRail, "buildDiscoveryImpressionKey", "Creator rail dedupe");
requireExcludes(creatorRail, 'trackEvent("creator_spotlight_viewed"', "Creator rail legacy render telemetry");

requireIncludes(telemetryCatalog, 'eventName: "featured_slide_viewed"', "Telemetry catalog featured slide viewed");
requireIncludes(telemetryCatalog, 'aliases: ["featured_drop_viewed"]', "Telemetry catalog featured viewed alias");
requireIncludes(telemetryCatalog, 'eventName: "featured_slide_clicked"', "Telemetry catalog featured slide clicked");
requireIncludes(telemetryCatalog, 'aliases: ["featured_drop_clicked"]', "Telemetry catalog featured clicked alias");
requireIncludes(telemetryCatalog, 'eventName: "creator_rail_impression"', "Telemetry catalog creator rail impression");
requireIncludes(telemetryCatalog, 'aliases: ["creator_spotlight_viewed"]', "Telemetry catalog creator rail alias");
for (const [eventName, fields] of [["drops_searched", ["query", "category", "sort"]], ["drops_category_selected", ["category", "sort", "query_length|queryLength", "query_hash|queryHash", "raw_query_stored|rawQueryStored"]], ["search_submitted", ["query_length|queryLength", "query_hash|queryHash", "query_category|queryCategory|intent_class|intentClass", "raw_query_stored|rawQueryStored"]]] as const) {
  const contract = buildTelemetryEventPayloadContract(eventName);
  if (!fields.every((field) => contract.requiredObjectFields.includes(field))) failures.push(`Telemetry catalog ${eventName} must retain its actual required discovery fields.`);
}
requireIncludes(telemetrySafety, '"impression_session_id"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"position"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"query"', "Telemetry safety discovery priority fields");
requireIncludes(telemetrySafety, '"sort"', "Telemetry safety discovery priority fields");

requireIncludes(behavioralNormalizer, 'featured_slide_clicked: { normalizedAction: "drop_card_viewed"', "Behavioral normalizer featured click");
requireIncludes(behavioralNormalizer, 'creator_rail_impression: { normalizedAction: "creator_spotlight_viewed"', "Behavioral normalizer creator rail");
requireIncludes(telemetryContracts, 'normalizeTelemetryEventName("featured_drop_clicked")).toBe("featured_slide_clicked")', "Telemetry contract featured alias");
requireIncludes(discoveryTests, "sanitizeDiscoveryQuery", "Discovery helper tests");

if (failures.length > 0) {
  console.error("Discovery tracking truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Discovery tracking truth validator passed.");
