import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures: string[] = [];
const requiredDoctrineNote =
  "DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.";

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

const experiencesClient = readRequired("src/app/experiences/ExperiencesClient.tsx");
const experiencesPresentation = readRequired("src/components/creative-tim/kandydrops/experiences/KandyExperiencesExperience.tsx");
const dailyCheckIn = readRequired("src/components/Dashboard/DailyCheckIn.tsx");
const dashboardClient = readRequired("src/app/dashboard/DashboardClient.tsx");
const readme = readRequired("README.md");
const compactDoctrine = readRequired("docs/agent-truth/experiences-compact-daily-hub.md");
const packageJson = readRequired("package.json");

function renderedExperiencesHeroMarkup() {
  const route = ts.createSourceFile("ExperiencesClient.tsx", experiencesClient, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const presentation = ts.createSourceFile("KandyExperiencesExperience.tsx", experiencesPresentation, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = route.statements.find(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
    && node.moduleSpecifier.text === "@/components/creative-tim/kandydrops/experiences/KandyExperiencesExperience");
  const clause = declaration && ts.isImportDeclaration(declaration) ? declaration.importClause?.namedBindings : undefined;
  const imported = clause && ts.isNamedImports(clause)
    ? clause.elements.find(node => (node.propertyName ?? node.name).text === "KandyExperiencesHero")?.name.text : undefined;
  const returned = (node: ts.FunctionDeclaration, tree: ts.SourceFile) => {
    const expressions: ts.Expression[] = [];
    const inspect = (child: ts.Node) => {
      if (child !== node && ts.isFunctionLike(child)) return;
      if (ts.isReturnStatement(child) && child.expression) expressions.push(child.expression);
      ts.forEachChild(child, inspect);
    };
    inspect(node);
    return expressions;
  };
  const routeFunction = route.statements.find(node => ts.isFunctionDeclaration(node)
    && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword));
  let rendered = false;
  const inspect = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(route) === imported) rendered = true;
    ts.forEachChild(node, inspect);
  };
  if (routeFunction && ts.isFunctionDeclaration(routeFunction)) for (const expression of returned(routeFunction, route)) inspect(expression);
  const hero = presentation.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "KandyExperiencesHero"
    && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  if (!imported || !rendered || !hero || !ts.isFunctionDeclaration(hero)) {
    failures.push("Experiences route must render its imported canonical KandyExperiencesHero owner.");
    return "";
  }
  return returned(hero, presentation).map(expression => expression.getText(presentation)).join("\n");
}
const experiencesHero = renderedExperiencesHeroMarkup();
requireIncludes(experiencesHero, 'data-experiences-hero-explainer-cards="removed"', "Rendered Experiences hero");

for (const removedHeroCard of [
  "Daily reset",
  "Reward loop",
  "Syncs with your check-in timer",
  "Earn Gum Drops for coming back daily",
]) {
  requireNotIncludes(experiencesHero, removedHeroCard, "Rendered Experiences compact hero");
}

for (const needle of [
  "data-experiences-layout=\"public-beta-compact\"",
  "<DailyCheckIn variant=\"experiences\" />",
  "<CreatorDiscoveryRail surface=\"experiences\" compact",
  "experience_hub_viewed",
]) {
  requireIncludes(experiencesClient, needle, "Experiences compact layout");
}

for (const bannedLayout of [
  "-mt-",
  "mt-[-",
  "-mb-",
  "mb-[-",
  "translate-y",
  "h-screen",
  "100vh",
]) {
  requireNotIncludes(experiencesClient, bannedLayout, "Experiences compact layout");
  requireNotIncludes(dailyCheckIn, bannedLayout, "DailyCheckIn compact variant");
}

for (const needle of [
  "type DailyCheckInVariant = \"dashboard\" | \"experiences\"",
  "variant = \"dashboard\"",
  "const isExperiencesVariant = variant === \"experiences\"",
  "data-daily-checkin-variant={variant}",
  "Welcome back, {firstName}.",
  "Your streak is ready when you are.",
  "{!isExperiencesVariant ? (",
  "aria-label=\"Loading daily rewards\"",
  "aria-busy=\"true\"",
  "motion-reduce:animate-none",
  "isExperiencesVariant ? \"py-3\" : \"py-4\"",
  "daily_checkin_claimed",
  "DAILY_CHECK_IN_REWARD_LADDER",
  "canvas-confetti",
]) {
  requireIncludes(dailyCheckIn, needle, "DailyCheckIn variant contract");
}

requireIncludes(dashboardClient, "<DailyCheckIn />", "Dashboard DailyCheckIn full variant");
requireNotIncludes(dashboardClient, "variant=\"experiences\"", "Dashboard DailyCheckIn full variant");

requireIncludes(compactDoctrine, requiredDoctrineNote, "Canonical Experiences two-variant contract");

requireIncludes(readme, "./docs/doctrine/surfaces/user-ui-doctrine.md", "README doctrine gateway");

requireIncludes(packageJson, "\"check:experiences-compact-layout\": \"tsx scripts/agent/validate-experiences-compact-layout.ts\"", "Package scripts");

if (failures.length > 0) {
  console.error("Experiences compact layout validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Experiences compact layout validation passed.");
