import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

import { findSourceFunction, hasJsxAttribute, hasRenderedExpression, readSourceAst, someSourceNode, sourceExpressionIs, sourceRenderNodes } from "./validate-behavioral-truth-source";

const root = process.cwd();
const failures: string[] = [];
function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) { failures.push(`Missing required file: ${relativePath}`); return ""; }
  return readFileSync(fullPath, "utf8");
}
function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}
function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) failures.push(`${label} must not include "${banned}".`);
}
function requireFact(condition: unknown, label: string) { if (!condition) failures.push(label); }
function importedName(source: ts.SourceFile, module: string, name: string) {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== module) continue;
    if (name === "default") return statement.importClause?.name?.text;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) return bindings.elements.find(element => (element.propertyName?.text ?? element.name.text) === name)?.name.text;
  }
  return undefined;
}
function exportedFunction(source: ts.SourceFile, name: string) {
  const direct = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === name && Boolean(statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)));
  if (direct) return direct;
  const memo = importedName(source, "react", "memo");
  let owner: ts.FunctionLikeDeclaration | undefined;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer || !ts.isCallExpression(declaration.initializer) || !ts.isIdentifier(declaration.initializer.expression) || declaration.initializer.expression.text !== memo) continue;
      const argument = declaration.initializer.arguments[0];
      owner = argument && ts.isIdentifier(argument) ? findSourceFunction(source, argument.text) : argument && (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) ? argument : undefined;
    }
  }
  return owner;
}
function renderNodes(source: ts.SourceFile, name: string) {
  const owner = exportedFunction(source, name);
  return owner ? sourceRenderNodes(source, owner) : [];
}
function renderedComponent(nodes: readonly ts.Node[], name: string | undefined) {
  let found: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined;
  if (name) someSourceNode(nodes, node => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === name) { found = node; return true; }
    return false;
  });
  return found;
}
function objectBinding(node: ts.ObjectBindingPattern, property: string) {
  return node.elements.find(element => (element.propertyName?.getText() ?? element.name.getText()) === property)?.name;
}

const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const stickyFilterBar = readRequired("src/components/StickyFilterBar.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropImpressionHook = readRequired("src/hooks/useDropCardImpression.ts");
const dropsSearchTelemetryHook = readRequired("src/hooks/useDropsSearchTelemetry.ts");
const useDrops = readRequired("src/hooks/useDrops.ts");
const dropCountdown = readRequired("src/lib/drop-countdown.ts");
const dropUnlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const unlockWatchContract = readRequired("src/lib/commerce/unlock-watch-parity-contract.ts");
const searchTelemetryContract = readRequired("src/lib/discovery/search-telemetry-contract.ts");
const agentDoc = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };

const clientAst = readSourceAst("src/app/drops/DropsClient.tsx");
const clientOwner = exportedFunction(clientAst, "DropsClient");
const clientRender = renderNodes(clientAst, "DropsClient");
const experienceName = importedName(clientAst, "@/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience", "DropsDiscoveryExperience");
const experience = renderedComponent(clientRender, experienceName);
const experienceRender = sourceRenderNodes(readSourceAst("src/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience.tsx"), "DropsDiscoveryExperience");
requireFact(experience && hasJsxAttribute(experienceRender, "data-drop-visibility-scope", "public_discovery") && hasJsxAttribute(experienceRender, "data-drops-page-density"), "Drops client must return the imported discovery composition with its public scope and density.");

const feedName = importedName(clientAst, "@/hooks/useDrops", "useDrops");
let feedBinding: ts.ObjectBindingPattern | undefined;
someSourceNode(clientOwner?.body, node => {
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === feedName) { feedBinding = node.name; return true; }
  return false;
});
const gridName = importedName(clientAst, "@/components/DropGrid", "DropGrid");
const collectionAttribute = experience?.attributes.properties.find((attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === "collection");
const collectionExpression = collectionAttribute?.initializer && ts.isJsxExpression(collectionAttribute.initializer) ? collectionAttribute.initializer.expression : undefined;
const gridConsumer = renderedComponent(collectionExpression ? [collectionExpression] : [], gridName);
const feedLoading = feedBinding && objectBinding(feedBinding, "loading");
const feedError = feedBinding && objectBinding(feedBinding, "error");
requireFact(gridConsumer && feedLoading && feedError && hasJsxAttribute([gridConsumer], "loading", feedLoading.getText()) && hasJsxAttribute([gridConsumer], "error", feedError.getText()), "Rendered collection must receive loading and error from the actual imported useDrops call.");

const gridAst = readSourceAst("src/components/DropGrid.tsx");
const gridOwner = exportedFunction(gridAst, "DropGrid");
const gridRender = renderNodes(gridAst, "DropGrid");
const gridProps = gridOwner?.parameters[0]?.name;
const errorProp = gridProps && ts.isObjectBindingPattern(gridProps) ? objectBinding(gridProps, "error") : undefined;
let sourceNotice: string | undefined;
someSourceNode(gridOwner?.body, node => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isConditionalExpression(node.initializer) && errorProp && sourceExpressionIs(node.initializer.condition, errorProp.getText()) && hasJsxAttribute([node.initializer.whenTrue], "role", "alert")) { sourceNotice = node.name.text; return true; }
  return false;
});
const skeletonName = importedName(gridAst, "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection", "KandyEditorialReleaseSkeleton");
const collectionName = importedName(gridAst, "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection", "KandyEditorialReleaseCollection");
requireFact(sourceNotice && hasRenderedExpression(gridRender, sourceNotice) && renderedComponent(gridRender, skeletonName) && renderedComponent(gridRender, collectionName), "DropGrid must render its actual error notice, shared loading skeleton and collection; comments or unused owners are insufficient.");
const collectionRender = sourceRenderNodes(readSourceAst("src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx"), "KandyEditorialReleaseCollection");
requireFact(hasJsxAttribute(collectionRender, "data-drops-collection-layout", "editorial-release-shelves"), "DropGrid collection must return its intrinsic editorial shelf.");
const loadingAst = readSourceAst("src/app/drops/loading.tsx");
const loadingName = importedName(loadingAst, "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection", "KandyEditorialReleaseSkeleton");
requireFact(renderedComponent(sourceRenderNodes(loadingAst), loadingName), "Drops loading route must return the same shared skeleton owner.");

const filterAst = readSourceAst("src/components/StickyFilterBar.tsx");
const inputName = importedName(filterAst, "@/components/creative-tim/ui/input", "Input");
const input = renderedComponent(sourceRenderNodes(filterAst), inputName);
requireFact(input && hasJsxAttribute([input], "type", "search") && hasJsxAttribute([input], "enterKeyHint", "search") && hasJsxAttribute([input], "onFocus", "onSearchFocus"), "Sticky filter must render the sourced search Input with search hints and its actual focus callback.");

for (const needle of ["useDeferredValue", "DROPS_MOBILE_UI_DENSITY", "drops_page_viewed", "initial_visible_drop_count"]) requireIncludes(dropsClient, needle, "Drops telemetry and deferred search path");
for (const needle of ["useDropsSearchTelemetry", "trackCategorySelected", "trackSearchFocus", "trackSearchResultClicked"]) requireIncludes(dropsClient, needle, "Drops search telemetry owner");
for (const needle of ["drops_category_selected", "search_submitted", "search_results_loaded", "resultCount: filteredDrops.length"]) requireIncludes(dropsSearchTelemetryHook, needle, "Drops search telemetry hook");
requireIncludes(searchTelemetryContract, "result_count", "Drops search telemetry contract");
for (const banned of ["min-h-[500px]", "pb-[calc(7.75rem+env(safe-area-inset-bottom))]", "pt-[calc(var(--kandy-cookie-offset,0px)+3.5rem)]"]) requireNotIncludes(dropsClient, banned, "Drops shell reservation");
for (const banned of ["framer-motion", "AnimatePresence", 'window.addEventListener("scroll"']) requireNotIncludes(stickyFilterBar, banned, "Filter critical hydration path");
for (const needle of ["usePrefersReducedMotion", "useNow", "compact_featured_carousel", "featured_rank", "ui_density", "DROPS_MOBILE_UI_DENSITY"]) requireIncludes(featuredCarousel, needle, "Featured motion and telemetry");
for (const banned of ["ActivityTicker", "animate-pulse"]) requireNotIncludes(featuredCarousel, banned, "Featured timers");
for (const needle of ["Browse Experiences", 'href="/experiences"']) requireIncludes(dropGrid, needle, "Drop grid recovery");
for (const banned of ["Notify Me", 'toast.success("Notify preference saved!', "py-16 md:py-24", "pb-20", "text-6xl"]) requireNotIncludes(dropGrid, banned, "Drop grid fake or oversized state");
for (const needle of ["useDropCardImpression", "drop_unlock_attempted", "drop_unwrap_intent_blocked_by_funds", "view_drop_details", 'source_component: "compact_drop_card"', "ui_density: DROPS_MOBILE_UI_DENSITY"]) requireIncludes(dropCard, needle, "DropCard telemetry");
for (const needle of ["buildServerUnlockTelemetryEvent", "trackServerEvent(serverUnlockTelemetry.eventName", '"unlock_drop_success"']) requireIncludes(dropUnlockRoute, needle, "Server unlock telemetry");
requireIncludes(unlockWatchContract, 'CANONICAL_SERVER_UNLOCK_EVENT_NAME = "drop_unlocked"', "Canonical server unlock event");
requireIncludes(unlockWatchContract, '"drop_unwrapped"', "Legacy unwrap alias classification");
for (const needle of ["useNow", "formatDropCountdown"]) requireIncludes(dropCardParts, needle, "DropCard shared timer");
requireNotIncludes(dropCardParts, "setInterval", "DropCard shared timer");
requireIncludes(dropCountdown, "Always available", "Drop countdown missing timestamp fallback");
for (const needle of ["drop_card_impression", "card_aspect_ratio", "ui_density: DROPS_MOBILE_UI_DENSITY"]) requireIncludes(dropImpressionHook, needle, "DropCard impression hook");
for (const needle of ["useDeferredClientReady", "runtimeSubscriptionReady", "idle: true", "initialData.length > 0"]) requireIncludes(useDrops, needle, "Drops deferred runtime and seed revalidation");
for (const needle of ["compact_mobile_apple_2026", "Firestore runtime subscription until idle", "Fake loaded states are forbidden", "Do not reintroduce"]) requireIncludes(agentDoc, needle, "Canonical Drops arrangement/hydration contract");
if (packageJson.scripts?.["check:drops-mobile-refinement"] !== "tsx scripts/agent/validate-drops-mobile-refinement.ts") failures.push("package.json must expose check:drops-mobile-refinement.");

if (failures.length > 0) { console.error("Drops mobile refinement validation failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("Drops mobile refinement validation passed.");
