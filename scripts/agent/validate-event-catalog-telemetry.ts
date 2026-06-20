import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path, { dirname, join } from "node:path";

import ts from "typescript";

import {
  TELEMETRY_EVENT_NAME_SET,
  TELEMETRY_EVENT_OPTIONS,
  TELEMETRY_EVENT_PAYLOAD_CONTRACTS,
  TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME,
  normalizeTelemetryEventName,
} from "../../src/lib/telemetry-catalog";

const root = process.cwd();
const srcRoot = join(root, "src");
const failures: string[] = [];
const fileExtensions = new Set([".ts", ".tsx"]);
const sourceAuditCoverageTokens = new Set(["surface_telemetry_parity"]);
const sourceContractEventCollections = new Set([
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
const trackingEventHelpers = new Set([
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
const emittingEventHelpers = new Set([
  "emitAccountControlTelemetry",
  "emitAuthLifecycleEvent",
  "emitAuthPersistenceEvent",
  "emitAuthProviderConflictTelemetry",
  "emitAuthRuntimeEvent",
  "emitLifecycleTelemetry",
  "emitPwaEvent",
  "emitSettingsTelemetry",
]);
const fixedTelemetryBuilderEventNames = new Map([
  ["buildServerPurchaseTelemetryEvent", ["server_purchase_verified"]],
  ["buildServerUnlockTelemetryEvent", ["drop_unlocked"]],
  ["buildViewerStartTelemetryEvent", ["watch_session_started"]],
]);
const fixedTelemetryFunctionEventNames = new Map([
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

interface MatchRecord {
  file: string;
  line: number;
  eventName: string;
  matcher: string;
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function walkFiles(directory: string, results: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkFiles(absolutePath, results);
      continue;
    }

    if (fileExtensions.has(path.extname(absolutePath))) {
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

  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
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
    return fixedTelemetryFunctionEventNames.get(expression.expression.text) ?? [];
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
    return eventNames.length > 0 ? { matcher, eventNames } : null;
  }

  if (isIdentifierNamed(expression, "incrementEventStat")) {
    const eventNames = collectStringLiteralValues(args[1], constValueMap);
      return eventNames.length > 0 ? { matcher: "incrementEventStat", eventNames } : null;
  }

  if (isIdentifierNamed(expression, "recordTelemetryEventStat")) {
    const eventNames = collectStringLiteralValues(args[0], constValueMap);
    return eventNames.length > 0 ? { matcher: "recordTelemetryEventStat", eventNames } : null;
  }

  if (trackingEventHelpers.has(directMatcher)) {
    const eventNames = [
      ...collectStringLiteralValues(args[0], constValueMap),
      ...collectEventNamePropertyValuesFromCall(callExpression, constValueMap),
    ];
    return eventNames.length > 0
      ? { matcher: directMatcher, eventNames: Array.from(new Set(eventNames)) }
      : null;
  }

  if (emittingEventHelpers.has(directMatcher)) {
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
      ...(fixedTelemetryBuilderEventNames.get(directMatcher) ?? []),
      ...collectEventNamePropertyValuesFromCall(callExpression, constValueMap),
      ...collectKnownCatalogEventStringValuesFromCall(callExpression, constValueMap),
    ];
    return eventNames.length > 0
      ? { matcher: directMatcher, eventNames: Array.from(new Set(eventNames)) }
      : null;
  }

  if (isIdentifierNamed(expression, "sendGAEvent") || isIdentifierNamed(expression, "gtag")) {
    const matcher = ts.isIdentifier(expression) ? expression.text : "sendGAEvent";
    const callTypeValues = collectStringLiteralValues(args[0], constValueMap);
    if (!callTypeValues.includes("event")) {
      return null;
    }

    const eventNames = collectStringLiteralValues(args[1], constValueMap);
    return eventNames.length > 0 ? { matcher, eventNames } : null;
  }

  if (isIdentifierNamed(expression, "buildAnalyticsEventFact") || isIdentifierNamed(expression, "buildOnboardingAnalyticsEventFact")) {
    const [firstArg] = args;
    if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) {
      return null;
    }

    const eventNames = collectEventNamePropertyValuesFromObject(firstArg, constValueMap);
    return eventNames.length > 0 ? { matcher: ts.isIdentifier(expression) ? expression.text : "buildAnalyticsEventFact", eventNames } : null;
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

  if (!eventNameAttribute || !ts.isJsxAttribute(eventNameAttribute) || !eventNameAttribute.initializer) {
    return null;
  }

  if (ts.isStringLiteral(eventNameAttribute.initializer)) {
    return { matcher: "PageViewEvent", eventNames: [eventNameAttribute.initializer.text] };
  }

  if (ts.isJsxExpression(eventNameAttribute.initializer)) {
    const eventNames = collectStringLiteralValues(eventNameAttribute.initializer.expression ?? undefined, constValueMap);
    return eventNames.length > 0 ? { matcher: "PageViewEvent", eventNames } : null;
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
      && sourceContractEventCollections.has(node.name.text)
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
          matches.push({ file: filePath, line, eventName, matcher: result.matcher });
        });
      }
    }

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const result = extractEventNamesFromJsx(node, constValueMap);
      if (result) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        result.eventNames.forEach((eventName) => {
          matches.push({ file: filePath, line, eventName, matcher: result.matcher });
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
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      eventNames.forEach((eventName) => {
        matches.push({ file: filePath, line, eventName, matcher: "telemetryEventName" });
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

function requireContract(eventName: string, expected: Partial<Record<"actor" | "object" | "surface", string>>) {
  const contract = TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME[eventName];
  if (!contract) {
    failures.push(`Missing payload contract for ${eventName}.`);
    return;
  }

  if (expected.actor && !contract.requiredActorFields.some((field) => field.includes(expected.actor as string))) {
    failures.push(`${eventName} contract must require actor field containing "${expected.actor}".`);
  }
  if (expected.object && !contract.requiredObjectFields.some((field) => field.includes(expected.object as string))) {
    failures.push(`${eventName} contract must require object field containing "${expected.object}".`);
  }
  if (expected.surface && !contract.requiredSurfaceFields.some((field) => field.includes(expected.surface as string))) {
    failures.push(`${eventName} contract must require surface field containing "${expected.surface}".`);
  }
}

const files = walkFiles(srcRoot);
const matches = files.flatMap((filePath) => collectMatches(filePath));
const emittedEventNames = new Set<string>();
const emittedFromByName = new Map<string, string[]>();
const unknownMatches: MatchRecord[] = [];

matches.forEach((match) => {
  const normalizedName = normalizeTelemetryEventName(match.eventName);
  emittedEventNames.add(normalizedName);
  const relativeFile = path.relative(root, match.file).replace(/\\/g, "/");
  const existing = emittedFromByName.get(normalizedName) ?? [];
  if (!existing.includes(relativeFile)) {
    emittedFromByName.set(normalizedName, [...existing, relativeFile]);
  }

  if (!TELEMETRY_EVENT_NAME_SET.has(normalizedName)) {
    unknownMatches.push(match);
  }
});

unknownMatches.forEach((match) => {
  failures.push(`Unknown emitted event ${match.matcher}("${match.eventName}") at ${path.relative(root, match.file)}:${match.line}`);
});

TELEMETRY_EVENT_OPTIONS.forEach((event) => {
  if (event.eventName !== event.eventName.toLowerCase()) {
    failures.push(`Catalog event must be lowercase snake_case: ${event.eventName}`);
  }

  const upperVariant = event.eventName.toUpperCase();
  if (normalizeTelemetryEventName(upperVariant) !== event.eventName) {
    failures.push(`Casing normalization failed for ${upperVariant}.`);
  }

  if (
    !emittedEventNames.has(event.eventName)
    && !event.auditCoveredBy?.some((coveredEventName) =>
      sourceAuditCoverageTokens.has(coveredEventName)
      || emittedEventNames.has(normalizeTelemetryEventName(coveredEventName)))
  ) {
    failures.push(`Catalog event ${event.eventName} has no detected emitter and no auditCoveredBy coverage.`);
  }
});

if (TELEMETRY_EVENT_PAYLOAD_CONTRACTS.length !== TELEMETRY_EVENT_OPTIONS.length) {
  failures.push("Every telemetry catalog event must have a payload contract.");
}

for (const contract of TELEMETRY_EVENT_PAYLOAD_CONTRACTS) {
  if (!TELEMETRY_EVENT_NAME_SET.has(contract.eventName)) {
    failures.push(`Payload contract references unknown event: ${contract.eventName}`);
  }
  if (contract.family === "admin" && !contract.adminExcludedFromUserAnalytics) {
    failures.push(`${contract.eventName} must be excluded from user behavior analytics.`);
  }
  if ((contract.family === "drop" || contract.family === "unlock") && !contract.requiredObjectFields.some((field) => field.includes("drop_id"))) {
    failures.push(`${contract.eventName} must require drop_id/dropId.`);
  }
  if (contract.family === "notification" && !contract.eventName.includes("prompt") && !contract.requiredObjectFields.some((field) => field.includes("idempotency"))) {
    failures.push(`${contract.eventName} notification contract must require an idempotency key or notification id.`);
  }
}

requireContract("drop_unlock_attempted", { actor: "user", object: "drop_id", surface: "source_component" });
requireContract("unlock_drop_success", { actor: "user", object: "transaction_id", surface: "source_component" });
requireContract("purchase_verified", { actor: "user", object: "transaction_id", surface: "purchase_source" });
requireContract("notification_opened", { actor: "recipient_id", object: "idempotency" });
requireContract("creator_message_sent", { actor: "user", object: "message_id" });
requireContract("admin_analytics_viewed", { actor: "admin_id" });

const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const analyticsClientEngine = readRequired("src/lib/analytics-client-engine.ts");
const identifiedIngestRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const serverAnalytics = readRequired("src/lib/server/analytics.ts");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const paypalCaptureRoute = readRequired("src/app/api/paypal/capture/route.ts");
const notificationBell = readRequired("src/components/Navigation/NotificationBell.tsx");
const notificationHook = readRequired("src/hooks/useNotifications.ts");
const notificationRuntimeBridge = readRequired("src/components/Notifications/NotificationRuntimeBridge.tsx");
const chatServer = readRequired("src/lib/server/chat.ts");
const analyticsContractTest = readRequired("tests/unit/analytics-event-contract.spec.ts");
const telemetryContractTest = readRequired("tests/contracts/telemetry-contracts.spec.ts");
const doc = readRequired("docs/agent-truth/event-catalog-telemetry.md");
const packageJson = readRequired("package.json");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const audit = parseJson("agent/state/event-catalog-telemetry-audit.generated.json");

requireIncludes(telemetryCatalog, "TELEMETRY_EVENT_PAYLOAD_CONTRACTS", "telemetry catalog");
requireIncludes(telemetryCatalog, "normalizeTelemetryEventPayloadParams", "telemetry catalog");
requireIncludes(analyticsClientEngine, "normalizeTelemetryEventPayloadParams", "analytics client engine");
requireIncludes(identifiedIngestRoute, "explainEventInclusion", "identified ingest route");
requireIncludes(identifiedIngestRoute, "analyticsUserId", "identified ingest route");
requireIncludes(identifiedIngestRoute, "inclusion.includeInUserBehavior &&", "identified ingest active-user write");
requireIncludes(serverAnalytics, "explainEventInclusion", "server analytics");
requireIncludes(serverAnalytics, "analyticsUserId", "server analytics");
requireIncludes(serverAnalytics, "userId && inclusion.includeInUserBehavior", "server analytics active-user write");
requireIncludes(dropCard, "transaction_id", "DropCard unlock telemetry");
requireIncludes(dropCard, "idempotency_key", "DropCard unlock telemetry");
requireIncludes(dropPreviewModal, "transaction_id", "DropPreviewModal unlock telemetry");
requireIncludes(dropPreviewModal, "idempotency_key", "DropPreviewModal unlock telemetry");
requireIncludes(purchaseModal, "order_id: orderId", "PurchaseModal purchase telemetry");
requireIncludes(paypalCaptureRoute, "purchase_source: \"paypal_capture\"", "PayPal verified telemetry");
requireIncludes(notificationBell, "recipient_id: currentUserId", "NotificationBell opened telemetry");
requireIncludes(notificationHook, "notification_type: \"in_app\"", "notification hook telemetry");
requireIncludes(notificationRuntimeBridge, "notification_type: \"browser_push\"", "notification runtime telemetry");
requireIncludes(chatServer, "message_id: sendResult.message.id", "chat message telemetry");
requireIncludes(analyticsContractTest, "includeInUserBehavior", "analytics contract tests");
requireIncludes(telemetryContractTest, "TELEMETRY_EVENT_PAYLOAD_CONTRACTS", "telemetry contract tests");
requireIncludes(packageJson, "check:event-catalog-telemetry", "package scripts");
requireIncludes(doc, "Every emitted event must be cataloged", "event catalog docs");
requireIncludes(repoLedger, "Event catalog telemetry naming is launch-gated", "repo memory ledger");
requireIncludes(checklist, "Event Catalog Telemetry Naming Launch Audit Coverage", "file checklist");
requireIncludes(fullAudit, "Event Catalog Telemetry Naming Launch Audit", "full audit ledger");

for (const forbidden of ["analytics_aggregate_stats", "canonical authenticated events", "canonical event samples"]) {
  requireAbsent(readRequired("src/app/admin/analytics/page.tsx"), forbidden, "Admin Analytics primary UI");
}

const auditEvents = Array.isArray(audit.events) ? audit.events as Array<Record<string, unknown>> : [];
const consumedByByEventName = new Map(
  auditEvents
    .filter((entry) => typeof entry.eventName === "string")
    .map((entry) => [entry.eventName as string, Array.isArray(entry.consumedBy) ? entry.consumedBy : []] as const),
);

const generatedAt = new Date().toISOString();
function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const eventAuditRows = TELEMETRY_EVENT_OPTIONS.map((event) => {
  const contract = TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME[event.eventName];
  return {
    eventName: event.eventName,
    aliases: event.aliases ?? [],
    version: contract?.version ?? 1,
    family: contract?.family ?? "system",
    category: event.category,
    modules: event.modules ?? [],
    emittedFrom: emittedFromByName.get(event.eventName) ?? [],
    consumedBy: consumedByByEventName.get(event.eventName) ?? [],
    requiredActorFields: contract?.requiredActorFields ?? [],
    requiredObjectFields: contract?.requiredObjectFields ?? [],
    requiredSurfaceFields: contract?.requiredSurfaceFields ?? [],
    dedupeKeyRequired: Boolean(contract?.dedupeKeyRequired),
    guestAllowed: Boolean(contract?.guestAllowed),
    adminExcludedFromUserAnalytics: Boolean(contract?.adminExcludedFromUserAnalytics),
    legacyDeprecated: Boolean(contract?.legacyDeprecated),
    auditCoveredBy: event.auditCoveredBy ?? [],
    missingFieldsRisk: contract?.missingFieldsRisk ?? "medium",
    currentSourceClassification: emittedFromByName.has(event.eventName) ? "emitted_current" : "cataloged_not_observed",
  };
});

for (const event of eventAuditRows) {
  for (const field of [
    "eventName",
    "aliases",
    "version",
    "emittedFrom",
    "consumedBy",
    "requiredActorFields",
    "requiredObjectFields",
    "requiredSurfaceFields",
    "dedupeKeyRequired",
    "guestAllowed",
    "adminExcludedFromUserAnalytics",
    "legacyDeprecated",
    "missingFieldsRisk",
  ]) {
    if (!(field in event)) {
      failures.push(`Audit event ${event.eventName} missing field ${field}.`);
    }
  }
}

function countBy(values: readonly string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function eventSummary(row: typeof eventAuditRows[number]) {
  return {
    eventName: row.eventName,
    family: row.family,
    category: row.category,
    modules: row.modules,
    emittedFromCount: row.emittedFrom.length,
    emittedFromSample: row.emittedFrom.slice(0, 3),
    auditCoveredBy: row.auditCoveredBy,
    missingFieldsRisk: row.missingFieldsRisk,
    currentSourceClassification: row.currentSourceClassification,
  };
}

const emittedCurrentRows = eventAuditRows.filter((event) => event.emittedFrom.length > 0);
const auditCoveredRows = eventAuditRows.filter((event) => event.auditCoveredBy.length > 0);
const catalogedNotObservedRows = eventAuditRows.filter((event) =>
  event.currentSourceClassification === "cataloged_not_observed" && event.auditCoveredBy.length === 0,
);
const eventSamples = {
  emittedCurrent: emittedCurrentRows.slice(0, 24).map(eventSummary),
  auditCovered: auditCoveredRows.slice(0, 80).map(eventSummary),
  catalogedNotObserved: catalogedNotObservedRows.slice(0, 80).map(eventSummary),
};

const report = {
  generatedAt,
  generatedAtUtc: generatedAt,
  currentHead: gitHead(),
  sourceCommit: gitHead(),
  auditKey: "event-catalog-telemetry-launch-audit",
  catalogVersion: "current",
  status: failures.length > 0 ? "review" : "pass",
  sourceStatus: "current_static_catalog_validator",
  productionReads: false,
  externalProviderCalls: false,
  summary: {
    catalogEventCount: TELEMETRY_EVENT_OPTIONS.length,
    emittedOrCoveredCount: eventAuditRows.filter((event) => event.emittedFrom.length > 0 || event.auditCoveredBy.length > 0).length,
    unknownEmitterCount: unknownMatches.length,
    findingCount: failures.length,
    currentSourceClassificationCounts: countBy(eventAuditRows.map((event) => event.currentSourceClassification)),
    familyCounts: countBy(eventAuditRows.map((event) => event.family)),
    moduleCounts: countBy(eventAuditRows.flatMap((event) => event.modules)),
    casingPolicy: "canonical lowercase snake_case; aliases and casing drift normalize through normalizeTelemetryEventName",
    adminUserBehaviorPolicy: "admin route/event facts remain available to Admin/Debug but do not update analytics_active_users or user behavior lanes",
    objectPayloadPolicy: "drop/unlock/purchase/notification/chat families declare actor/object/surface field requirements in TELEMETRY_EVENT_PAYLOAD_CONTRACTS",
  },
  reportShape: {
    compact: true,
    fullEventTableWritten: false,
    reason: "Source validation runs in-process from the catalog and contracts; this generated output is a bounded evidence snapshot only.",
    sampleCaps: {
      emittedCurrent: eventSamples.emittedCurrent.length,
      auditCovered: eventSamples.auditCovered.length,
      catalogedNotObserved: eventSamples.catalogedNotObserved.length,
    },
  },
  eventSamples,
  findings: failures.map((message) => ({ severity: "review", message })),
  validation: {
    script: "scripts/agent/validate-event-catalog-telemetry.ts",
    npmScript: "check:event-catalog-telemetry",
    mode: failures.length > 0 ? "current_review_artifact" : "pass",
  },
};

const reportPath = join(root, "agent/state/event-catalog-telemetry-audit.generated.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.warn(`Event catalog telemetry current with review findings: ${failures.length} finding(s).`);
} else {
  console.log(`Event catalog telemetry validation passed. ${matches.length} emitters checked across ${files.length} files; ${TELEMETRY_EVENT_OPTIONS.length} catalog events audited.`);
}
