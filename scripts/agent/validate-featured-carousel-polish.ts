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
function requireIncludes(source: string, expected: string, label: string) { if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`); }
function requireNotIncludes(source: string, banned: string, label: string) { if (source.includes(banned)) failures.push(`${label} must not include "${banned}".`); }
function requireFact(condition: unknown, label: string) { if (!condition) failures.push(label); }
function importedName(source: ts.SourceFile, module: string, name: string) {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== module) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) return bindings.elements.find(element => (element.propertyName?.text ?? element.name.text) === name)?.name.text;
  }
  return undefined;
}
function objectBinding(owner: ts.FunctionLikeDeclaration | undefined, property: string) {
  const parameter = owner?.parameters[0]?.name;
  return parameter && ts.isObjectBindingPattern(parameter) ? parameter.elements.find(element => (element.propertyName?.getText() ?? element.name.getText()) === property)?.name : undefined;
}
function renderedComponent(nodes: readonly ts.Node[], name: string | undefined) {
  let found: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined;
  if (name) someSourceNode(nodes, node => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === name) { found = node; return true; }
    return false;
  });
  return found;
}
function titleConsumerRender(source: ts.SourceFile, name: string) {
  const direct = sourceRenderNodes(source, name);
  if (direct.length > 0) return direct;
  const memo = importedName(source, "react", "memo");
  let owner: ts.FunctionLikeDeclaration | undefined;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer || !ts.isCallExpression(declaration.initializer) || !ts.isIdentifier(declaration.initializer.expression) || declaration.initializer.expression.text !== memo) continue;
      const first = declaration.initializer.arguments[0];
      if (first && (ts.isFunctionExpression(first) || ts.isArrowFunction(first))) owner = first;
    }
  }
  return owner ? sourceRenderNodes(source, owner) : [];
}

function calledBinding(owner: ts.FunctionLikeDeclaration | undefined, name: string | undefined, argument: string, memo = false) {
  let found: string | undefined;
  if (!name) return found;
  someSourceNode(owner?.body, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return false;
    let value: ts.Expression | undefined = node.initializer;
    if (memo) {
      if (!ts.isCallExpression(value)) return false;
      const factory = value.arguments[0];
      if (!factory || !ts.isArrowFunction(factory) || ts.isBlock(factory.body)) return false;
      value = factory.body;
    }
    if (ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === name && value.arguments.length === 1 && sourceExpressionIs(value.arguments[0], argument)) { found = node.name.text; return true; }
    return false;
  });
  return found;
}

const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const editorialCard = readRequired("src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard.tsx");
const marquee = readRequired("src/components/ui/MarqueeText.tsx");
const titleMarquee = readRequired("src/components/ui/TitleMarquee.tsx");
const globalsCss = readRequired("src/app/globals.css");
const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const canonicalDoc = readRequired("docs/agent-truth/drops-mobile-refinement.md");

const featuredAst = readSourceAst("src/components/FeaturedCarousel.tsx");
const featuredRender = sourceRenderNodes(featuredAst, "FeaturedCarousel");
const slide = findSourceFunction(featuredAst, "FeaturedDropSlide");
const slideDrop = objectBinding(slide, "drop");
const accent = calledBinding(slide, "resolveFeaturedCoverAccent", slideDrop?.getText() ?? "", true);
const buttonName = importedName(featuredAst, "@/components/ui/Button", "Button");
let accentButton: ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined;
someSourceNode(featuredRender, node => {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === buttonName && accent && hasJsxAttribute([node], "data-featured-cta-accent", `${accent}.accentName`)) { accentButton = node; return true; }
  return false;
});
const accentOwner = findSourceFunction(featuredAst, "resolveFeaturedCoverAccent");
requireFact(accentButton && hasJsxAttribute([accentButton], "data-featured-cta-cover-aware", "true") && ["drop.title", "drop.type", "drop.imageUrl", "drop.tags"].every(field => someSourceNode(accentOwner?.body, node => sourceExpressionIs(node, field))), "Featured CTA must render the shared Button and metadata accent from its actual slide Drop; no unused call or comment admission.");
for (const needle of ["featured_cta_accent", "compact_featured_carousel", "ui_density"]) requireIncludes(featuredCarousel, needle, "Featured telemetry");

const socialProof = calledBinding(slide, "getFeaturedSocialProof", slideDrop?.getText() ?? "", true);
let socialReadout: ts.JsxElement | undefined;
someSourceNode(featuredRender, node => {
  if (ts.isJsxElement(node) && socialProof && hasJsxAttribute([node.openingElement], "data-featured-social-proof-type", `${socialProof}.type`) && hasRenderedExpression([node], `${socialProof}.label`)) { socialReadout = node; return true; }
  return false;
});
const socialOwner = findSourceFunction(featuredAst, "getFeaturedSocialProof");
requireFact(socialReadout && someSourceNode(socialOwner?.body, node => sourceExpressionIs(node, "totalUnwraps > 10")) && someSourceNode(socialOwner?.body, node => ts.isCallExpression(node) && sourceExpressionIs(node.expression, "getDropViewCount") && sourceExpressionIs(node.arguments[0], "drop")), "Featured visible social readout must consume its slide's canonical unwraps>10/views projection.");
requireIncludes(featuredCarousel, "featured_social_proof_type", "Featured social telemetry");

const cardAst = readSourceAst("src/components/DropCard.tsx");
const base = findSourceFunction(cardAst, "DropCardBase");
const cardDrop = objectBinding(base, "drop");
const viewName = importedName(cardAst, "@/lib/drop-engagement", "getDropViewCount");
const viewBinding = calledBinding(base, viewName, cardDrop?.getText() ?? "");
const cardName = importedName(cardAst, "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard", "KandyEditorialReleaseCard");
const renderedCard = renderedComponent(sourceRenderNodes(cardAst, "DropCardBase"), cardName);
const memoName = importedName(cardAst, "react", "memo");
const actualCardExport = cardAst.statements.some(statement => ts.isVariableStatement(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) && statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "DropCard" && declaration.initializer && sourceExpressionIs(declaration.initializer, `${memoName}(DropCardBase)`)));
const editorialAst = readSourceAst("src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCard.tsx");
const editorialRender = sourceRenderNodes(editorialAst, "KandyEditorialReleaseCard");
const totalViews = objectBinding(findSourceFunction(editorialAst, "KandyEditorialReleaseCard"), "totalViews");
requireFact(actualCardExport && viewBinding && renderedCard && hasJsxAttribute([renderedCard], "totalViews", viewBinding) && totalViews && hasRenderedExpression(editorialRender, `${totalViews.getText()}.toLocaleString()`), "Grid view count must flow from the imported canonical getDropViewCount result through the returned Card into its visible readout.");
requireNotIncludes(dropGrid, "getDropViewCount", "DropGrid must not receive a new view-count branch");

const hasFullTitle = (nodes: readonly ts.Node[]) => someSourceNode(nodes, node => ts.isJsxElement(node) && ts.isIdentifier(node.openingElement.tagName) && node.openingElement.tagName.text === "h3" && hasRenderedExpression([node], "drop.title") && someSourceNode(node.openingElement.attributes, attribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === "className" && Boolean(attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text.includes("[overflow-wrap:anywhere]"))));
requireFact(hasFullTitle(featuredRender) && hasFullTitle(editorialRender), "Current Featured and editorial Card titles must remain fully rendered and wrapping; no truncation/comment substitute.");
const titleAst = readSourceAst("src/components/ui/TitleMarquee.tsx");
const marqueeName = importedName(titleAst, "@/components/ui/MarqueeText", "MarqueeText");
const wrapper = renderedComponent(sourceRenderNodes(titleAst, "TitleMarquee"), marqueeName);
requireFact(wrapper && hasJsxAttribute([wrapper], "title", "title") && hasJsxAttribute([wrapper], "speed", "public-beta-fast"), "Truncated-title compatibility wrapper must render the imported shared MarqueeText with its existing fast title projection.");
for (const path of ["src/components/Dashboard/OwnedDropGalleryCard.tsx", "src/components/Dashboard/LiveDropsForYouCarousel.tsx", "src/components/HomeDropTicker.tsx"]) {
  const source = readSourceAst(path), importName = importedName(source, "@/components/ui/TitleMarquee", "TitleMarquee");
  const ownerName = path.includes("OwnedDropGalleryCard") ? "OwnedDropGalleryCard" : path.includes("LiveDropsForYouCarousel") ? "LiveDropsForYouCarousel" : "HomeDropTicker";
  const title = renderedComponent(titleConsumerRender(source, ownerName), importName);
  requireFact(title && hasJsxAttribute([title], "title", "drop.title"), `${path} must keep its imported rendered title wrapper.`);
}
for (const needle of ["--title-marquee-duration: 11.67s", "animation: title-marquee-anim var(--title-marquee-duration)", "@media (prefers-reduced-motion: reduce)", ".title-marquee-active"]) requireIncludes(globalsCss, needle, "Existing title animation CSS");
for (const needle of ["delaySeed * 0.75", "ResizeObserver", "requestAnimationFrame", '"public-beta-fast"']) requireIncludes(marquee, needle, "Existing shared title measurement/speed owner");
requireNotIncludes(marquee, "setInterval", "Shared title measurement must not add JS animation loops");
requireNotIncludes(titleMarquee, "ResizeObserver", "Title wrapper must not duplicate shared measurement");

requireFact(someSourceNode(featuredRender, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && sourceExpressionIs(node.tagName, "TimerWithProgress")), "Featured slide must render its shared-store timer readout.");
for (const needle of ["useNow", "formatDropCountdown", "Always available"]) requireIncludes(featuredCarousel, needle, "Featured timer projection");
for (const banned of ["LifetimeProgressBar", "w-[104px]"]) requireNotIncludes(featuredCarousel, banned, "Featured timer visual clutter");
requireNotIncludes(dropCardParts, "Film", "Existing compatibility media-count camera indicator");
requireIncludes(dropCardParts, "🎥", "Existing compatibility media-count camera indicator");
requireIncludes(dropCardParts, "aria-label={fileCountLabel}", "Existing accessible compatibility media count");
requireIncludes(featuredCarousel, "🎥", "Featured camera video indicator");
requireIncludes(editorialCard, 'Video } from "lucide-react"', "Sourced editorial video-camera indicator");
requireIncludes(editorialCard, '{files.videos === 1 ? "video" : "videos"}', "Editorial textual video count");
for (const banned of ["getImageData", "createImageBitmap", "OffscreenCanvas", "canvas.getContext"]) requireNotIncludes(featuredCarousel + dropCardParts + marquee, banned, "Featured metadata must not sample image pixels");
for (const banned of ["ResizeObserver", "MutationObserver"]) requireNotIncludes(featuredCarousel + dropCardParts, banned, "Featured/Card timer must not add observers");
for (const needle of ["Featured source projections", "metadata", "getFeaturedSocialProof", "getDropViewCount", "TitleMarquee", "MarqueeText"]) requireIncludes(canonicalDoc, needle, "Canonical feature routing contract");
if (packageJson.scripts?.["check:featured-carousel-polish"] !== "tsx scripts/agent/validate-featured-carousel-polish.ts") failures.push("package.json must expose check:featured-carousel-polish.");

if (failures.length > 0) { console.error("Featured carousel polish validation failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("Featured carousel polish validation passed.");
