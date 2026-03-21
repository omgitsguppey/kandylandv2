import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  TELEMETRY_EVENT_NAME_SET,
  TELEMETRY_EVENT_OPTIONS,
  normalizeTelemetryEventName,
} from "../src/lib/telemetry-catalog";

const ROOT = path.resolve(process.cwd(), "src");
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

interface MatchRecord {
  file: string;
  line: number;
  eventName: string;
  matcher: string;
}

function walkFiles(directory: string, results: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkFiles(absolutePath, results);
      continue;
    }

    if (FILE_EXTENSIONS.has(path.extname(absolutePath))) {
      results.push(absolutePath);
    }
  }

  return results;
}

function collectStringLiteralValues(
  expression: ts.Expression | undefined,
  constValueMap: Map<string, string[]>,
): string[] {
  if (!expression) {
    return [];
  }

  if (ts.isStringLiteralLike(expression)) {
    return [expression.text];
  }

  if (ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text];
  }

  if (ts.isParenthesizedExpression(expression)) {
    return collectStringLiteralValues(expression.expression, constValueMap);
  }

  if (ts.isConditionalExpression(expression)) {
    return [
      ...collectStringLiteralValues(expression.whenTrue, constValueMap),
      ...collectStringLiteralValues(expression.whenFalse, constValueMap),
    ];
  }

  if (ts.isIdentifier(expression)) {
    return constValueMap.get(expression.text) ?? [];
  }

  return [];
}

function buildConstValueMap(sourceFile: ts.SourceFile) {
  const constValueMap = new Map<string, string[]>();

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const values = collectStringLiteralValues(node.initializer, constValueMap);
      if (values.length > 0) {
        constValueMap.set(node.name.text, Array.from(new Set(values)));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return constValueMap;
}

function isIdentifierNamed(expression: ts.LeftHandSideExpression, expected: string) {
  return ts.isIdentifier(expression) && expression.text === expected;
}

function extractEventNamesFromCall(
  callExpression: ts.CallExpression,
  constValueMap: Map<string, string[]>,
): { matcher: string; eventNames: string[] } | null {
  const expression = callExpression.expression;
  const args = callExpression.arguments;

  if (isIdentifierNamed(expression, "trackEvent") || isIdentifierNamed(expression, "trackServerEvent")) {
    const matcher = ts.isIdentifier(expression) ? expression.text : "trackEvent";
    const eventNames = collectStringLiteralValues(args[0], constValueMap);
    return eventNames.length > 0
      ? { matcher, eventNames }
      : null;
  }

  if (isIdentifierNamed(expression, "incrementEventStat")) {
    const eventNames = collectStringLiteralValues(args[1], constValueMap);
    return eventNames.length > 0
      ? { matcher: "incrementEventStat", eventNames }
      : null;
  }

  if (isIdentifierNamed(expression, "sendGAEvent") || isIdentifierNamed(expression, "gtag")) {
    const matcher = ts.isIdentifier(expression) ? expression.text : "sendGAEvent";
    const callTypeValues = collectStringLiteralValues(args[0], constValueMap);
    if (!callTypeValues.includes("event")) {
      return null;
    }

    const eventNames = collectStringLiteralValues(args[1], constValueMap);
    return eventNames.length > 0
      ? { matcher, eventNames }
      : null;
  }

  if (isIdentifierNamed(expression, "buildAnalyticsEventFact") || isIdentifierNamed(expression, "buildOnboardingAnalyticsEventFact")) {
    const [firstArg] = args;
    if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) {
      return null;
    }

    const eventNameProperty = firstArg.properties.find((property) =>
      ts.isPropertyAssignment(property)
      && ((ts.isIdentifier(property.name) && property.name.text === "eventName")
        || (ts.isStringLiteral(property.name) && property.name.text === "eventName")),
    );

    if (!eventNameProperty || !ts.isPropertyAssignment(eventNameProperty)) {
      return null;
    }

    const eventNames = collectStringLiteralValues(eventNameProperty.initializer, constValueMap);
    return eventNames.length > 0
      ? { matcher: ts.isIdentifier(expression) ? expression.text : "buildAnalyticsEventFact", eventNames }
      : null;
  }

  return null;
}

function collectMatches(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const constValueMap = buildConstValueMap(sourceFile);
  const matches: MatchRecord[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const result = extractEventNamesFromCall(node, constValueMap);
      if (result) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        result.eventNames.forEach((eventName) => {
          matches.push({
            file: filePath,
            line,
            eventName,
            matcher: result.matcher,
          });
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

const files = walkFiles(ROOT);
const matches = files.flatMap((filePath) => collectMatches(filePath));
const emittedEventNames = new Set<string>();
const unknownMatches: MatchRecord[] = [];

matches.forEach((match) => {
  const normalizedName = normalizeTelemetryEventName(match.eventName);
  emittedEventNames.add(normalizedName);

  if (!TELEMETRY_EVENT_NAME_SET.has(normalizedName)) {
    unknownMatches.push(match);
  }
});

if (unknownMatches.length > 0) {
  console.error("Telemetry audit failed. Unknown event emitters found:");
  unknownMatches.forEach((match) => {
    console.error(`- ${path.relative(process.cwd(), match.file)}:${match.line} -> ${match.matcher}("${match.eventName}")`);
  });
  process.exit(1);
}

const catalogedButUnemitted = TELEMETRY_EVENT_OPTIONS
  .map((event) => event.eventName)
  .filter((eventName) => !emittedEventNames.has(eventName));

console.log(`Telemetry audit passed. ${matches.length} literal or resolvable emitters checked across ${files.length} files.`);
console.log(`Cataloged events with no detected emitters: ${catalogedButUnemitted.length}`);
if (catalogedButUnemitted.length > 0) {
  console.log(catalogedButUnemitted.join(", "));
}
