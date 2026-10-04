import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { findSourceFunction, readSourceAst, sourceExpressionIs, sourceRenderNodes, someSourceNode } from "./validate-behavioral-truth-source";

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

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

function walkSourceFiles(relativeDir: string): string[] {
  const absoluteDir = join(root, relativeDir);
  if (!existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const absoluteEntry = join(absoluteDir, entry);
    const stat = statSync(absoluteEntry);
    if (stat.isDirectory()) {
      files.push(...walkSourceFiles(join(relativeDir, entry)));
      continue;
    }
    if (/\.(ts|tsx)$/u.test(entry)) {
      files.push(join(relativeDir, entry).replace(/\\/gu, "/"));
    }
  }
  return files;
}

const routePage = readRequired("src/app/drops/[id]/preview/page.tsx");
const previewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const previewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const previewTruth = readRequired("src/lib/locked-drop-preview-truth.ts");
const dropsPage = readRequired("src/app/drops/page.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const packageJson = readRequired("package.json");

if (existsSync(join(root, "src/components/DropPreviewModal.tsx"))) {
  failures.push("Retired DropPreviewModal must be physically absent, even when unused.");
}

const shareAst = readSourceAst("src/components/Drops/LockedDropPreviewClient.tsx");
let shareViewName: string | undefined;
for (const statement of shareAst.statements) {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "@/components/Drops/LockedDropPreviewView") continue;
  const bindings = statement.importClause?.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) shareViewName = bindings.elements.find((entry) => (entry.propertyName?.text ?? entry.name.text) === "LockedDropPreviewView")?.name.text;
}
let shareCallbackName: string | undefined;
someSourceNode(sourceRenderNodes(shareAst, "LockedDropPreviewClient"), (node) => {
  if ((!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) || !ts.isIdentifier(node.tagName) || node.tagName.text !== shareViewName) return false;
  const property = node.attributes.properties.find((attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === "onShare");
  if (property?.initializer && ts.isJsxExpression(property.initializer) && property.initializer.expression && ts.isIdentifier(property.initializer.expression)) shareCallbackName = property.initializer.expression.text;
  return false;
});
const shareFunction = shareCallbackName ? findSourceFunction(shareAst, shareCallbackName) : undefined;
const shareDeclarations = shareFunction?.body && ts.isBlock(shareFunction.body) ? shareFunction.body.statements.flatMap((statement) => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []) : [];
const sharePath = shareDeclarations.find((declaration) => ts.isIdentifier(declaration.name) && sourceExpressionIs(declaration.initializer, "`/drops/${encodeURIComponent(drop.id)}/preview`"));
const shareUrl = sharePath && ts.isIdentifier(sharePath.name) ? shareDeclarations.find((declaration) => ts.isIdentifier(declaration.name) && sourceExpressionIs(declaration.initializer, "`${window.location.origin}${" + sharePath.name.getText() + "}`")) : undefined;
const shareCalls: ts.CallExpression[] = [];
if (shareFunction?.body) {
  const collectActiveShareCalls = (node: ts.Node): boolean => {
    if (ts.isFunctionLike(node)) return true;
    if (ts.isBlock(node)) {
      for (const statement of node.statements) {
        if (!collectActiveShareCalls(statement)) return false;
      }
      return true;
    }
    if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
      if (node.expression) collectActiveShareCalls(node.expression);
      return false;
    }
    if (ts.isIfStatement(node)) {
      collectActiveShareCalls(node.expression);
      let condition = node.expression;
      while (ts.isParenthesizedExpression(condition)) condition = condition.expression;
      if (condition.kind === ts.SyntaxKind.FalseKeyword) return node.elseStatement ? collectActiveShareCalls(node.elseStatement) : true;
      if (condition.kind === ts.SyntaxKind.TrueKeyword) return collectActiveShareCalls(node.thenStatement);
      const thenContinues = collectActiveShareCalls(node.thenStatement);
      const elseContinues = node.elseStatement ? collectActiveShareCalls(node.elseStatement) : true;
      return thenContinues || elseContinues;
    }
    if (ts.isTryStatement(node)) {
      const tryContinues = collectActiveShareCalls(node.tryBlock);
      const catchContinues = node.catchClause ? collectActiveShareCalls(node.catchClause.block) : false;
      const finallyContinues = node.finallyBlock ? collectActiveShareCalls(node.finallyBlock) : true;
      return finallyContinues && (tryContinues || catchContinues);
    }
    if (ts.isCallExpression(node)) shareCalls.push(node);
    ts.forEachChild(node, (child) => { collectActiveShareCalls(child); });
    return true;
  };
  collectActiveShareCalls(shareFunction.body);
}
const nativeShare = shareUrl && ts.isIdentifier(shareUrl.name) && shareCalls.some((call) => sourceExpressionIs(call.expression, "navigator.share") && call.arguments.length === 1 && ts.isObjectLiteralExpression(call.arguments[0]) && call.arguments[0].properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText() === "url" && sourceExpressionIs(property.initializer, shareUrl.name.getText())));
const clipboardShare = shareUrl && ts.isIdentifier(shareUrl.name) && shareCalls.some((call) => sourceExpressionIs(call.expression, "navigator.clipboard.writeText") && call.arguments.length === 1 && sourceExpressionIs(call.arguments[0], shareUrl.name.getText()));
if (!sharePath || !shareUrl || !nativeShare || !clipboardShare) failures.push("Returned full-page Share callback must supply the encoded safe preview URL to native share and clipboard.");

requireIncludes(routePage, "toLockedDropPreviewSafeDrop(drop)", "Full-page preview route");
const routeAst = readSourceAst("src/app/drops/[id]/preview/page.tsx");
const metadata = findSourceFunction(routeAst, "generateMetadata");
let safeProjectionName: string | undefined;
for (const statement of routeAst.statements) {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
    || statement.moduleSpecifier.text !== "@/lib/locked-drop-preview-truth") continue;
  const bindings = statement.importClause?.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) safeProjectionName = bindings.elements.find((entry) =>
    (entry.propertyName?.text ?? entry.name.text) === "toLockedDropPreviewSafeDrop")?.name.text;
}
const safeProjection = metadata?.body && ts.isBlock(metadata.body) ? metadata.body.statements.flatMap((statement) =>
  ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).find((declaration) =>
  ts.isIdentifier(declaration.name) && declaration.initializer && ts.isCallExpression(declaration.initializer)
  && ts.isIdentifier(declaration.initializer.expression) && declaration.initializer.expression.text === safeProjectionName
  && declaration.initializer.arguments.length === 1 && sourceExpressionIs(declaration.initializer.arguments[0], "drop")) : undefined;
const canonicalConnected = safeProjection && ts.isIdentifier(safeProjection.name) && metadata?.body && ts.isBlock(metadata.body)
  && metadata.body.statements.some((statement) => ts.isReturnStatement(statement) && statement.expression
    && ts.isObjectLiteralExpression(statement.expression) && statement.expression.properties.some((property) =>
      ts.isPropertyAssignment(property) && property.name.getText() === "alternates" && ts.isObjectLiteralExpression(property.initializer)
      && property.initializer.properties.some((entry) => ts.isPropertyAssignment(entry) && entry.name.getText() === "canonical"
        && sourceExpressionIs(entry.initializer, "`/drops/${encodeURIComponent(" + safeProjection.name.getText() + ".id)}/preview`"))));
if (!canonicalConnected) failures.push("Preview canonical URL must be returned from the imported safe Drop projection.");
requireIncludes(previewTruth, "safePreviewFieldsOnly: true", "Preview truth safe-fields marker");
requireIncludes(previewView, 'data-safe-preview-fields-only="true"', "Preview view safe-fields data marker");
requireIncludes(previewView, 'data-drop-preview-page="true"', "Preview page data marker");

for (const [source, label] of [
  [routePage, "preview route"],
  [previewClient, "preview client"],
  [previewView, "preview view"],
  [previewTruth, "preview truth helper"],
] as const) {
  requireNotIncludes(source, "contentUrl", label);
  requireNotIncludes(source, "contentUrls", label);
}

requireIncludes(
  dropsPage,
  "redirect(`/drops/${encodeURIComponent(requestedDropId)}/preview?source_component=legacy_drop_query`)",
  "Legacy /drops?drop redirect",
);
requireIncludes(
  dropsClient,
  "router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=${encodeURIComponent(sourceComponent)}`)",
  "Drops page preview handoff",
);
requireNotIncludes(dropsClient, "DropPreviewModal", "DropsClient canonical preview ownership");
requireIncludes(dropCard, 'onPreview(drop, "compact_drop_card")', "DropCard preview source handoff");
requireIncludes(featuredCarousel, 'onSelectDrop(drop, "compact_featured_carousel")', "Featured preview source handoff");
requireIncludes(
  creatorProfile,
  "router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=creator_profile_drop_grid`)",
  "Creator profile drop handoff",
);
requireNotIncludes(creatorProfile, "onSelectDrop={() => {}}", "Creator profile drop handoff");
requireIncludes(dropGrid, "onPreview={onSelectDrop}", "DropGrid delegates preview routing to caller");

for (const filePath of walkSourceFiles("src/app").concat(walkSourceFiles("src/components"))) {
  const source = readRequired(filePath);
  if (source.includes("DropPreviewModal")) {
    failures.push(`${filePath} must not depend on legacy DropPreviewModal as a canonical entry point.`);
  }
}

requireIncludes(
  packageJson,
  '"check:drop-preview-legacy-handoff": "tsx scripts/agent/validate-drop-preview-legacy-handoff.ts"',
  "package.json",
);

if (failures.length > 0) {
  console.error("Drop preview legacy handoff validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Drop preview legacy handoff validation passed.");
