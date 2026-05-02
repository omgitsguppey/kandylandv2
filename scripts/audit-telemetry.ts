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

const KNOWN_IMPORTED_CONST_PROPERTY_VALUES = new Map<string, string[]>([
  ["CREATOR_EXPERIENCE_PAID_EVENTS.fan_pass", ["creator_fan_pass_started"]],
  ["CREATOR_EXPERIENCE_PAID_EVENTS.private_chat", ["creator_private_chat_opened"]],
  ["CREATOR_EXPERIENCE_PAID_EVENTS.custom_request", ["creator_custom_request_created"]],
  ["CREATOR_EXPERIENCE_PAID_EVENTS.live_time", ["creator_live_time_booked"]],
]);

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

  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    const key = `${expression.expression.text}.${expression.name.text}`;
    return constValueMap.get(key) ?? KNOWN_IMPORTED_CONST_PROPERTY_VALUES.get(key) ?? [];
  }

  if (
    ts.isElementAccessExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.argumentExpression
    && ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    const key = `${expression.expression.text}.${expression.argumentExpression.text}`;
    return constValueMap.get(key) ?? KNOWN_IMPORTED_CONST_PROPERTY_VALUES.get(key) ?? [];
  }

  return [];
}

function buildConstValueMap(sourceFile: ts.SourceFile) {
  const constValueMap = new Map<string, string[]>();

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const variableName = node.name.text;
      const values = collectStringLiteralValues(node.initializer, constValueMap);
      if (values.length > 0) {
        constValueMap.set(variableName, Array.from(new Set(values)));
      }

      if (ts.isObjectLiteralExpression(node.initializer)) {
        node.initializer.properties.forEach((property) => {
          if (!ts.isPropertyAssignment(property)) {
            return;
          }

          const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
            ? property.name.text
            : "";
          if (!propertyName) {
            return;
          }

          const propertyValues = collectStringLiteralValues(property.initializer, constValueMap);
          if (propertyValues.length > 0) {
            constValueMap.set(
              `${variableName}.${propertyName}`,
              Array.from(new Set(propertyValues)),
            );
          }
        });
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

  if (
    isIdentifierNamed(expression, "trackEvent")
    || isIdentifierNamed(expression, "trackServerEvent")
    || isIdentifierNamed(expression, "trackCreatorExperienceEvent")
  ) {
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

function extractEventNamesFromJsx(
  node: ts.JsxSelfClosingElement | ts.JsxOpeningElement,
  constValueMap: Map<string, string[]>,
): { matcher: string; eventNames: string[] } | null {
  const tagName = node.tagName.getText();
  if (tagName !== "PageViewEvent") {
    return null;
  }

  const eventNameAttribute = node.attributes.properties.find((attribute) =>
    ts.isJsxAttribute(attribute)
    && ts.isIdentifier(attribute.name)
    && attribute.name.text === "eventName",
  );

  if (!eventNameAttribute || !ts.isJsxAttribute(eventNameAttribute)) {
    return null;
  }

  const initializer = eventNameAttribute.initializer;
  if (!initializer) {
    return null;
  }

  if (ts.isStringLiteral(initializer)) {
    return {
      matcher: "PageViewEvent",
      eventNames: [initializer.text],
    };
  }

  if (ts.isJsxExpression(initializer)) {
    const eventNames = collectStringLiteralValues(initializer.expression ?? undefined, constValueMap);
    return eventNames.length > 0
      ? {
          matcher: "PageViewEvent",
          eventNames,
        }
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

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const result = extractEventNamesFromJsx(node, constValueMap);
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

    if (
      ts.isPropertyAssignment(node)
      && (
        (ts.isIdentifier(node.name) && node.name.text === "telemetryEventName")
        || (ts.isStringLiteral(node.name) && node.name.text === "telemetryEventName")
      )
    ) {
      const eventNames = collectStringLiteralValues(node.initializer, constValueMap);
      if (eventNames.length > 0) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        eventNames.forEach((eventName) => {
          matches.push({
            file: filePath,
            line,
            eventName,
            matcher: "telemetryEventName",
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
  .filter((event) => {
    if (emittedEventNames.has(event.eventName)) {
      return false;
    }

    if (event.auditCoveredBy?.some((coveredEventName) => emittedEventNames.has(normalizeTelemetryEventName(coveredEventName)))) {
      return false;
    }

    return true;
  })
  .map((event) => event.eventName);

console.log(`Telemetry audit passed. ${matches.length} literal or resolvable emitters checked across ${files.length} files.`);
console.log(`Cataloged events with no detected emitters: ${catalogedButUnemitted.length}`);
if (catalogedButUnemitted.length > 0) {
  console.error("Telemetry audit failed. Cataloged events have no detected emitters or explicit audit coverage:");
  catalogedButUnemitted.forEach((eventName) => {
    console.error(`- ${eventName}`);
  });
  process.exit(1);
}
