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

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}


function hasMatchingDropAffordabilityProfile(source: string) {
  const tree = ts.createSourceFile("DropCard.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwrap = (expression: ts.Expression): ts.Expression => {
    while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression)) expression = expression.expression;
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === "Boolean" && expression.arguments.length === 1) return unwrap(expression.arguments[0]);
    return expression;
  };
  const property = (expression: ts.Expression, owner: string, name: string) => {
    expression = unwrap(expression);
    return ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === owner && expression.name.text === name;
  };
  const exported = tree.statements.flatMap(statement => ts.isVariableStatement(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ? [...statement.declarationList.declarations] : []).find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "DropCard");
  const memo = exported?.initializer && unwrap(exported.initializer);
  if (!memo || !ts.isCallExpression(memo) || !ts.isIdentifier(memo.expression) || memo.expression.text !== "memo" || !ts.isIdentifier(memo.arguments[0])) return false;
  const component = tree.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === (memo.arguments[0] as ts.Identifier).text);
  if (!component || !ts.isFunctionDeclaration(component) || !component.body || !component.parameters[0] || !ts.isObjectBindingPattern(component.parameters[0].name)) return false;
  const binding = (pattern: ts.ObjectBindingPattern, key: string) => pattern.elements.find(element => (element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : ts.isIdentifier(element.name) ? element.name.text : "") === key)?.name;
  const user = binding(component.parameters[0].name, "user");
  const declarations = component.body.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []);
  const contextBinding = (hook: string, key: string) => {
    const declaration = declarations.find(declaration => ts.isObjectBindingPattern(declaration.name) && declaration.initializer && ts.isCallExpression(declaration.initializer) && ts.isIdentifier(declaration.initializer.expression) && declaration.initializer.expression.text === hook);
    return declaration && ts.isObjectBindingPattern(declaration.name) ? binding(declaration.name, key) : undefined;
  };
  const profile = contextBinding("useUserProfile", "userProfile"), loading = contextBinding("useAuthLoading", "loading");
  if (!user || !profile || !loading || !ts.isIdentifier(user) || !ts.isIdentifier(profile) || !ts.isIdentifier(loading)) return false;
  const parts = (expression: ts.Expression): ts.Expression[] => { expression = unwrap(expression); return ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? [...parts(expression.left), ...parts(expression.right)] : [expression]; };
  const ready = declarations.find(declaration => {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return false;
    const terms = parts(declaration.initializer);
    return terms.some(term => ts.isPrefixUnaryExpression(term) && term.operator === ts.SyntaxKind.ExclamationToken && ts.isIdentifier(term.operand) && term.operand.text === loading.text)
      && terms.some(term => property(term, user.text, "uid"))
      && terms.some(term => ts.isBinaryExpression(term) && term.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && ((property(term.left, profile.text, "uid") && property(term.right, user.text, "uid")) || (property(term.right, profile.text, "uid") && property(term.left, user.text, "uid"))));
  });
  if (!ready || !ts.isIdentifier(ready.name)) return false;
  const projected = declarations.find(declaration => declaration.initializer && ts.isConditionalExpression(declaration.initializer) && ts.isIdentifier(declaration.initializer.condition) && declaration.initializer.condition.text === (ready.name as ts.Identifier).text && ts.isIdentifier(declaration.initializer.whenTrue) && declaration.initializer.whenTrue.text === profile.text && declaration.initializer.whenFalse.kind === ts.SyntaxKind.NullKeyword);
  if (!projected || !ts.isIdentifier(projected.name)) return false;
  const resolver = (expression: ts.Expression): ts.CallExpression | null => {
    expression = unwrap(expression);
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
    if (expression.expression.text === "resolveDropCardVisibilityState") return expression;
    if (expression.expression.text !== "useMemo" || !expression.arguments[0] || !ts.isArrowFunction(expression.arguments[0])) return null;
    const body = expression.arguments[0].body;
    if (!ts.isBlock(body)) return resolver(body);
    const result = body.statements.find(statement => ts.isReturnStatement(statement) && statement.expression);
    return result && ts.isReturnStatement(result) && result.expression ? resolver(result.expression) : null;
  };
  const visibility = declarations.find(declaration => {
    const call = declaration.initializer && resolver(declaration.initializer);
    const options = call?.arguments[0];
    return options && ts.isObjectLiteralExpression(options) && options.properties.some(entry => ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === "gumDropsBalance" && property(entry.initializer, (projected.name as ts.Identifier).text, "gumDropsBalance"));
  });
  if (!visibility || !ts.isIdentifier(visibility.name)) return false;
  const jsx = (expression: ts.Expression | undefined) => expression && ts.isJsxSelfClosingElement(unwrap(expression)) ? unwrap(expression) as ts.JsxSelfClosingElement : null;
  const attribute = (element: ts.JsxSelfClosingElement, name: string) => { const entry = element.attributes.properties.find(entry => ts.isJsxAttribute(entry) && ts.isIdentifier(entry.name) && entry.name.text === name); return entry && ts.isJsxAttribute(entry) && entry.initializer && ts.isJsxExpression(entry.initializer) ? entry.initializer.expression : undefined; };
  const cta = declarations.find(declaration => {
    const element = jsx(declaration.initializer);
    if (!element || !ts.isIdentifier(element.tagName) || element.tagName.text !== "DropCardCta") return false;
    const affordability = attribute(element, "canAfford"), state = attribute(element, "ctaState");
    return affordability && state && property(affordability, (visibility.name as ts.Identifier).text, "canAfford") && property(state, (visibility.name as ts.Identifier).text, "ctaState");
  });
  if (!cta || !ts.isIdentifier(cta.name)) return false;
  return component.body.statements.some(statement => {
    const element = ts.isReturnStatement(statement) ? jsx(statement.expression) : null;
    if (!element || !ts.isIdentifier(element.tagName) || element.tagName.text !== "KandyEditorialReleaseCard") return false;
    const actualCta = attribute(element, "cta");
    return actualCta && ts.isIdentifier(actualCta) && actualCta.text === (cta.name as ts.Identifier).text;
  });
}

const helper = readRequired("src/lib/drop-card-visibility.ts");
const dropGrid = readRequired("src/components/DropGrid.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropCardLayout = readRequired("src/components/DropCardLayout.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const dropUnlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agentInstructions = readRequired("AGENTS.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const dropsTruth = readRequired("docs/agent-truth/drops-mobile-refinement.md");
const paymentTruth = readRequired("docs/agent-truth/payment-wallet-unlock-entitlement.md");
const visibilityTruth = readRequired("docs/agent-truth/drop-cover-visibility-truth.md");

for (const expected of [
  "resolveDropCardVisibilityState",
  "coverTreatment: DropCoverTreatment",
  "\"clear\"",
  "\"blurred_guest\"",
  "\"blurred_insufficient_balance\"",
  "\"hidden_expired\"",
  "\"owned\"",
  "ctaState: DropCtaState",
  "\"create_profile\"",
  "\"unwrap\"",
  "\"refill\"",
  "\"view\"",
  "\"unavailable\"",
  "canAfford",
  "shortfallGd",
  "reasonCode",
  "gumDropsBalance",
]) {
  requireIncludes(helper, expected, "Drop card visibility helper");
}

if (!hasMatchingDropAffordabilityProfile(dropCard)) failures.push("DropCard affordability must use the matching ready profile through its rendered CTA.");

for (const expected of [
  "resolveDropCardVisibilityState",
  "getDropCardVisibilityTelemetryPayload",
  "drop_unwrap_intent_blocked_by_funds",
  "drop_unlock_attempted",
  "view_drop_details",
]) {
  requireIncludes(dropCard, expected, "DropCard affordability and telemetry path");
}

for (const expected of [
  "buildServerUnlockTelemetryEvent",
  "trackServerEvent(serverUnlockTelemetry.eventName",
  "...serverUnlockTelemetry.params",
  '"unlock_drop_success"',
]) {
  requireIncludes(dropUnlockRoute, expected, "Drop unlock route canonical telemetry path");
}

for (const expected of [
  "hasProductCoverBlur",
  "imageLoaded ? \"scale-100\" : \"scale-105 blur-md\"",
  "visibilityState.shouldBlurCover",
  "data-drop-card-should-blur-cover",
  "\"data-drop-cover-treatment\"",
  "\"data-drop-cta-state\"",
  "\"data-drop-affordability-reason\"",
  "\"data-drop-card-auth-state\"",
]) {
  requireIncludes(dropCardLayout, expected, "DropCard layout explicit cover treatment");
}

for (const expected of [
  "resolveDropCardVisibilityState",
  "resolveFeaturedCoverAccent",
  "data-featured-drop-affordability",
  "data-featured-drop-cta-state",
  "Create account to unwrap",
  "Refill to unwrap",
  "Unwrap for",
  "View Content",
  "featured_slide_clicked",
]) {
  requireIncludes(featuredCarousel, expected, "Featured carousel visibility and CTA path");
}

for (const banned of [
  "LifetimeProgressBar",
  "progressPercent",
  "w-[104px]",
  "getImageData",
  "createImageBitmap",
]) {
  requireNotIncludes(featuredCarousel, banned, "Featured carousel timer/chip path");
}

for (const banned of [
  "gumDropsPurchasedBalance",
  "gumDropsRewardBalance",
  "spendSourceAwareGumdrops",
  "purchasedAmountSpent",
  "rewardAmountSpent",
]) {
  requireNotIncludes(helper + dropGrid + dropCard + dropCardLayout + featuredCarousel, banned, "Normal drop card/client visibility path");
}

for (const expected of [
  "Drop cover blur is product-state driven, not loading-state driven.",
  "Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop.",
  "Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.",
]) {
  requireIncludes(readme, expected, "User manual doctrine");
  requireIncludes(agentInstructions, expected, "AI system/context doctrine");
  requireIncludes(fullAudit, expected, "Dev truth audit doctrine");
  requireIncludes(repoLedger, expected, "Dev truth memory doctrine");
  requireIncludes(dropsTruth + paymentTruth + visibilityTruth, expected, "Agent-truth drop visibility doctrine");
}

requireIncludes(packageJson, "\"check:drop-cover-visibility-truth\": \"tsx scripts/agent/validate-drop-cover-visibility-truth.ts\"", "package.json");

if (failures.length > 0) {
  console.error("Drop cover visibility truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Drop cover visibility truth validation passed.");
