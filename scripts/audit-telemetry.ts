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
const SOURCE_AUDIT_COVERAGE_TOKENS = new Set(["surface_telemetry_parity"]);
const SOURCE_CONTRACT_EVENT_COLLECTIONS = new Set([
  "CHAT_REALTIME_TELEMETRY_EVENTS",
  "CHAT_PRESENCE_TELEMETRY_EVENT_NAMES",
  "CHAT_TELEMETRY_EVENT_FAMILY_INPUTS",
  "ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS",
  "CREATOR_DROP_4XX_POLICIES",
  "CREATOR_DROP_WORKFLOW_TRANSITIONS",
  "CREATOR_MONETIZATION_EVENTS",
  "FAN_PASS_LIFECYCLE_EVENTS",
  "MEDIA_ACCESS_EVENTS",
  "MEDIA_UPLOAD_LIFECYCLE_EVENTS",
  "NOTIFICATION_TARGETING_TELEMETRY_EVENTS",
  "PWA_SERVICE_WORKER_TELEMETRY_EVENTS",
  "SEARCH_DISCOVERY_EVENTS",
  "TASK_GUIDANCE_EVENT_NAMES",
  "DAILY_CHECK_IN_TASK_CONTRACT",
  "GENERIC_TASK_LIFECYCLE_EVENT_NAMES",
  "SEARCH_INTENT_EVENT_NAMES",
  "NEGATIVE_PREFERENCE_EVENT_NAMES",
  "CANONICAL_SERVER_UNLOCK_ALIASES",
  "IMPORTANT_EVENT_LIVENESS_INPUTS",
]);
const TRACKING_EVENT_HELPERS = new Set([
  "trackCreatorDropEvent",
  "trackCreatorExperienceEvent",
  "trackCreatorRelationshipRouteEvent",
  "trackLifecycle",
  "trackLifecycleOnce",
  "trackNotificationPromptLifecycleEvent",
  "trackPushTokenLifecycleEvent",
  "trackPushTokenServerEvent",
  "trackPwaServiceWorkerEvent",
  "trackReasonFeedback",
  "trackSatisfaction",
]);
const EMITTING_EVENT_HELPERS = new Set([
  "emitAccountControlTelemetry",
  "emitAuthLifecycleEvent",
  "emitAuthPersistenceEvent",
  "emitAuthProviderConflictTelemetry",
  "emitAuthRuntimeEvent",
  "emitLifecycleTelemetry",
  "emitPwaEvent",
  "emitSettingsTelemetry",
]);
const FIXED_TELEMETRY_BUILDER_EVENT_NAMES = new Map([
  ["buildServerPurchaseTelemetryEvent", ["server_purchase_verified"]],
  ["buildServerUnlockTelemetryEvent", ["drop_unlocked"]],
  ["buildViewerStartTelemetryEvent", ["watch_session_started"]],
]);
const FIXED_TELEMETRY_FUNCTION_EVENT_NAMES = new Map([
  [
    "getPreviewCtaEventName",
    [
      "drop_preview_guest_signup_cta_viewed",
      "drop_preview_guest_signup_cta_clicked",
      "drop_preview_topup_cta_viewed",
      "drop_preview_topup_cta_clicked",
      "drop_preview_unwrap_cta_viewed",
      "drop_preview_unwrap_cta_clicked",
    ],
  ],
  [
    "telemetryEventForDropViewAccess",
    [
      "drop_view_access_allowed_unwrapped",
      "drop_view_access_denied_not_unwrapped",
      "drop_view_access_loading_timeout",
      "drop_view_access_error",
    ],
  ],
]);

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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
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

  const unwrappedExpression = unwrapExpression(expression);
  if (unwrappedExpression !== expression) {
    return collectStringLiteralValues(unwrappedExpression, constValueMap);
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

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) =>
      ts.isExpression(element)
        ? collectStringLiteralValues(element, constValueMap)
        : [],
    );
  }

  if (
    ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === "map"
  ) {
    return collectStringLiteralValues(expression.expression.expression, constValueMap);
  }

  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    return FIXED_TELEMETRY_FUNCTION_EVENT_NAMES.get(expression.expression.text) ?? [];
  }

  if (ts.isNewExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === "Set") {
    return collectStringLiteralValues(expression.arguments?.[0], constValueMap);
  }

  if (
    ts.isBinaryExpression(expression)
    && (
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
    )
  ) {
    return [
      ...collectStringLiteralValues(expression.left, constValueMap),
      ...collectStringLiteralValues(expression.right, constValueMap),
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

function collectTelemetryPropertyValuesFromObject(
  expression: ts.ObjectLiteralExpression,
  constValueMap: Map<string, string[]>,
  propertyNames: readonly string[],
) {
  const propertyNameSet = new Set(propertyNames);
  return expression.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return [];
    }

    const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : "";
    if (!propertyNameSet.has(propertyName)) {
      return [];
    }

    return collectStringLiteralValues(property.initializer, constValueMap);
  });
}

function collectEventNamePropertyValuesFromObject(expression: ts.ObjectLiteralExpression, constValueMap: Map<string, string[]>) {
  const eventNameProperty = expression.properties.find((property) =>
    ts.isPropertyAssignment(property)
    && ((ts.isIdentifier(property.name) && property.name.text === "eventName")
      || (ts.isStringLiteral(property.name) && property.name.text === "eventName")),
  );

  return eventNameProperty && ts.isPropertyAssignment(eventNameProperty)
    ? collectStringLiteralValues(eventNameProperty.initializer, constValueMap)
    : [];
}

function collectSourceContractEventNames(
  expression: ts.Expression,
  constValueMap: Map<string, string[]>,
): string[] {
  const unwrappedExpression = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(unwrappedExpression)) {
    return unwrappedExpression.elements.flatMap((element) => {
      if (!ts.isExpression(element)) {
        return [];
      }

      const unwrappedElement = unwrapExpression(element);
      if (ts.isObjectLiteralExpression(unwrappedElement)) {
        return collectTelemetryPropertyValuesFromObject(unwrappedElement, constValueMap, ["eventName", "telemetryEvent"]);
      }

      if (ts.isCallExpression(unwrappedElement)) {
        return collectEventNamePropertyValuesFromCall(unwrappedElement, constValueMap)
          .concat(unwrappedElement.arguments.flatMap((argument) =>
            ts.isObjectLiteralExpression(argument)
              ? collectTelemetryPropertyValuesFromObject(argument, constValueMap, ["eventName", "telemetryEvent"])
              : [],
          ));
      }

      return collectStringLiteralValues(unwrappedElement, constValueMap);
    });
  }

  if (ts.isObjectLiteralExpression(unwrappedExpression)) {
    return unwrappedExpression.properties.flatMap((property) => {
      if (!ts.isPropertyAssignment(property)) {
        return [];
      }

      const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : "";
      if (propertyName !== "telemetryEvents") {
        return [];
      }

      return collectStringLiteralValues(property.initializer, constValueMap);
    });
  }

  if (
    ts.isCallExpression(unwrappedExpression)
    && ts.isPropertyAccessExpression(unwrappedExpression.expression)
    && unwrappedExpression.expression.name.text === "map"
  ) {
    return collectSourceContractEventNames(unwrappedExpression.expression.expression, constValueMap);
  }

  return collectStringLiteralValues(unwrappedExpression, constValueMap);
}

function collectSourceContractPushEventNames(
  callExpression: ts.CallExpression,
  constValueMap: Map<string, string[]>,
): string[] {
  if (
    !ts.isPropertyAccessExpression(callExpression.expression)
    || callExpression.expression.name.text !== "push"
    || !ts.isIdentifier(callExpression.expression.expression)
    || callExpression.expression.expression.text !== "events"
  ) {
    return [];
  }

  let current: ts.Node = callExpression;
  while (current.parent) {
    if (ts.isFunctionDeclaration(current.parent) && current.parent.name?.text === "buildCreatorAdminLifecycleEvents") {
      return callExpression.arguments.flatMap((argument) => collectStringLiteralValues(argument, constValueMap));
    }
    current = current.parent;
  }

  return [];
}

function collectEventNamePropertyValuesFromCall(callExpression: ts.CallExpression, constValueMap: Map<string, string[]>) {
  return callExpression.arguments.flatMap((argument) =>
    ts.isObjectLiteralExpression(argument)
      ? collectEventNamePropertyValuesFromObject(argument, constValueMap)
      : [],
  );
}

function collectKnownCatalogEventStringValuesFromCall(callExpression: ts.CallExpression, constValueMap: Map<string, string[]>) {
  return callExpression.arguments
    .flatMap((argument) => collectStringLiteralValues(argument, constValueMap))
    .filter((value) => TELEMETRY_EVENT_NAME_SET.has(normalizeTelemetryEventName(value)));
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

      if (ts.isCallExpression(node.initializer)) {
        const returnedEventNames = collectEventNamePropertyValuesFromCall(node.initializer, constValueMap);
        if (returnedEventNames.length > 0) {
          constValueMap.set(
            `${variableName}.eventName`,
            Array.from(new Set(returnedEventNames)),
          );
        }
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
  const directMatcher = ts.isIdentifier(expression) ? expression.text : "";

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

  if (TRACKING_EVENT_HELPERS.has(directMatcher)) {
    const eventNames = [
      ...collectStringLiteralValues(args[0], constValueMap),
      ...collectEventNamePropertyValuesFromCall(callExpression, constValueMap),
    ];
    return eventNames.length > 0
      ? { matcher: directMatcher, eventNames: Array.from(new Set(eventNames)) }
      : null;
  }

  if (EMITTING_EVENT_HELPERS.has(directMatcher)) {
    const eventNames = [
      ...callExpression.arguments.flatMap((argument) => collectStringLiteralValues(argument, constValueMap)),
      ...collectEventNamePropertyValuesFromCall(callExpression, constValueMap),
    ];
    return eventNames.length > 0
      ? { matcher: directMatcher, eventNames: Array.from(new Set(eventNames)) }
      : null;
  }

  if (/^build[A-Z].*Telemetry/u.test(directMatcher)) {
    const eventNames = [
      ...(FIXED_TELEMETRY_BUILDER_EVENT_NAMES.get(directMatcher) ?? []),
      ...collectEventNamePropertyValuesFromCall(callExpression, constValueMap),
      ...collectKnownCatalogEventStringValuesFromCall(callExpression, constValueMap),
    ];
    return eventNames.length > 0
      ? { matcher: directMatcher, eventNames: Array.from(new Set(eventNames)) }
      : null;
  }

  if (isIdentifierNamed(expression, "incrementEventStat")) {
    const eventNames = collectStringLiteralValues(args[1], constValueMap);
    return eventNames.length > 0
      ? { matcher: "incrementEventStat", eventNames }
      : null;
  }

  if (isIdentifierNamed(expression, "recordTelemetryEventStat")) {
    const eventNames = collectStringLiteralValues(args[0], constValueMap);
    return eventNames.length > 0
      ? { matcher: "recordTelemetryEventStat", eventNames }
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

    const eventNames = collectEventNamePropertyValuesFromObject(firstArg, constValueMap);
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
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && SOURCE_CONTRACT_EVENT_COLLECTIONS.has(node.name.text)
    ) {
      const sourceContractName = node.name.text;
      const eventNames = collectSourceContractEventNames(node.initializer, constValueMap);
      if (eventNames.length > 0) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        Array.from(new Set(eventNames)).forEach((eventName) => {
          matches.push({
            file: filePath,
            line,
            eventName,
            matcher: `sourceContract:${sourceContractName}`,
          });
        });
      }
    }

    if (ts.isCallExpression(node)) {
      const sourceContractPushEventNames = collectSourceContractPushEventNames(node, constValueMap);
      if (sourceContractPushEventNames.length > 0) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        Array.from(new Set(sourceContractPushEventNames)).forEach((eventName) => {
          matches.push({
            file: filePath,
            line,
            eventName,
            matcher: "sourceContract:resolveCreatorAdminActionEvents",
          });
        });
      }

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

    if (event.auditCoveredBy?.some((coveredEventName) =>
      SOURCE_AUDIT_COVERAGE_TOKENS.has(coveredEventName)
      || emittedEventNames.has(normalizeTelemetryEventName(coveredEventName)))) {
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
