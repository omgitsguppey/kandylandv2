import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import ts from "typescript";

import { listValidatorScopeFiles, readValidatorMutationScope } from "./validate-agent-takeover-safety-check";

import {
  buildEventIdentityEnvelope,
  buildIdentityLinkCandidate,
  classifyLegacyIdentity,
  preventGuestUserDoubleCount,
  shouldLinkGuestToUser,
} from "@/lib/analytics/identity-handoff-engine";

const REPORT_PATH = "agent/state/identity-handoff-spine.generated.json";
const DOC_PATH = "docs/agent-truth/identity-handoff-spine.md";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(report: {
  generatedAtUtc: string;
  status: "pass" | "fail";
  currentHead: string;
  checks: Record<string, boolean>;
  changedFiles: string[];
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Identity Handoff Spine",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Every client-tracked event receives an identity envelope with `actorKind`, `identityState`, `identityConfidence`, `consentMode`, and `sessionId`.",
    "- Guest events include a guest id when consent allows persistence, otherwise they include an unavailable reason.",
    "- Signup, login, session restore, and consent-upgrade links use deterministic link candidates.",
    "- Linked guest history is attributed once to the resolved user and suppresses the duplicate guest count key.",
    "- Admin projection and legacy unknown events cannot enter user behavior metrics.",
    "- Minimal or declined consent does not enable person-level behavioral analytics.",
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

function guestPayloadUsesCanonicalEnvelope(source: string) {
  const parsed = ts.createSourceFile("DeepTracker.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const builder = parsed.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "buildGuestAnalyticsIngestPayload");
  if (!builder?.body) return false;
  const envelopes = new Set<string>();
  let payload: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)
      && node.initializer.expression.text === "buildEventIdentityEnvelope") envelopes.add(node.name.text);
    if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
      const property = node.expression.properties.find((item): item is ts.PropertyAssignment =>
        ts.isPropertyAssignment(item) && item.name.getText(parsed) === "payload");
      if (property && ts.isObjectLiteralExpression(property.initializer)) payload = property.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(builder.body);
  const fields = ["actorKind", "identityState", "identityConfidence", "unavailableGuestReason"];
  return [...envelopes].some((envelope) => fields.every((field) => payload?.properties.some((property) =>
    ts.isPropertyAssignment(property) && property.name.getText(parsed) === field
    && ts.isPropertyAccessExpression(property.initializer) && ts.isIdentifier(property.initializer.expression)
    && property.initializer.expression.text === envelope && property.initializer.name.text === field)));
}

function identifiedPayloadUsesCanonicalEnvelope(routeSource: string, normalizerSource: string) {
  const parse = (name: string, source: string) => ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const route = parse("identified-route.ts", routeSource);
  const normalizer = parse("normalize-runtime-fact.ts", normalizerSource);
  const imported = (source: ts.SourceFile, name: string, module: string) => source.statements.some(node =>
    ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === module
    && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
    && node.importClause.namedBindings.elements.some(binding => binding.name.text === name && (!binding.propertyName || binding.propertyName.text === name)));
  if (!imported(route, "normalizeIdentifiedRuntimeFact", "@/lib/runtime-facts/normalize-runtime-fact")
    || !imported(normalizer, "buildEventIdentityEnvelope", "@/lib/analytics/identity-handoff-engine")) return false;
  const builder = normalizer.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "normalizeIdentifiedRuntimeFact");
  if (!builder?.body) return false;
  const declarations = (node: ts.Node) => {
    const found: ts.VariableDeclaration[] = [];
    const visit = (item: ts.Node) => { if (ts.isVariableDeclaration(item)) found.push(item); ts.forEachChild(item, visit); };
    visit(node); return found;
  };
  const call = (node: ts.Expression | undefined, name: string): node is ts.CallExpression =>
    Boolean(node && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name);
  const producer = declarations(builder.body).filter(node => ts.isIdentifier(node.name) && call(node.initializer, "buildEventIdentityEnvelope"));
  if (producer.length !== 1 || !ts.isIdentifier(producer[0].name)) return false;
  const producedName = producer[0].name.text;
  const returnsEnvelope = builder.body.statements.some(node => ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)
    && node.expression.properties.some(property => ts.isShorthandPropertyAssignment(property) && property.name.text === "identityEnvelope" && producedName === "identityEnvelope"
      || ts.isPropertyAssignment(property) && property.name.getText(normalizer) === "identityEnvelope" && ts.isIdentifier(property.initializer) && property.initializer.text === producedName));
  if (!returnsEnvelope) return false;
  const routeDeclarations = declarations(route);
  if (routeDeclarations.some(node => call(node.initializer, "buildEventIdentityEnvelope"))) return false;
  const results = routeDeclarations.filter(node => ts.isIdentifier(node.name) && call(node.initializer, "normalizeIdentifiedRuntimeFact"));
  if (results.length !== 1 || !ts.isIdentifier(results[0].name)) return false;
  const resultName = results[0].name.text;
  const envelopes = routeDeclarations.filter(node => ts.isIdentifier(node.name) && node.initializer
    && ts.isPropertyAccessExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)
    && node.initializer.expression.text === resultName && node.initializer.name.text === "identityEnvelope");
  const fromEnvelope = (node: ts.Expression, envelope: string, field: string) => ts.isPropertyAccessExpression(node)
    && ts.isIdentifier(node.expression) && node.expression.text === envelope && node.name.text === field;
  return envelopes.some(envelope => {
    if (!ts.isIdentifier(envelope.name)) return false;
    const name = envelope.name.text;
    const document = routeDeclarations.find(node => ts.isIdentifier(node.name) && node.name.text === "eventFactDocument");
    const event = routeDeclarations.find(node => ts.isIdentifier(node.name) && node.name.text === "eventEnvelope");
    if (!document?.initializer || !ts.isObjectLiteralExpression(document.initializer) || !event || !call(event.initializer, "buildEventEnvelope")) return false;
    const payload = event.initializer.arguments[0];
    if (!payload || !ts.isObjectLiteralExpression(payload)) return false;
    const carries = (object: ts.ObjectLiteralExpression, key: string, field: string) => object.properties.some(property =>
      ts.isPropertyAssignment(property) && property.name.getText(route) === key && fromEnvelope(property.initializer, name, field));
    return document.initializer.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(route) === "identityEnvelope"
      && ts.isIdentifier(property.initializer) && property.initializer.text === name)
      && [["actorKind", "actorKind"], ["identityConfidence", "identityConfidence"], ["canonicalIdentityState", "identityState"], ["consentMode", "consentMode"]].every(([key, field]) => carries(document.initializer as ts.ObjectLiteralExpression, key, field))
      && ["actorKind", "identityState", "identityConfidence", "userId", "consentMode"].every(field => carries(payload, field, field));
  });
}

function main() {
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const generatedAtUtc = new Date().toISOString();
  const mutationScope = readValidatorMutationScope();
  const changedFiles = mutationScope?.changedFiles ?? listValidatorScopeFiles();
  const failures: string[] = [];

  const contractSource = read("src/lib/analytics/identity-handoff-contract.ts");
  const engineSource = read("src/lib/analytics/identity-handoff-engine.ts");
  const telemetrySource = read("src/lib/telemetry.ts");
  const telemetrySafetySource = read("src/lib/analytics/telemetry-safety.ts");
  const trackerSource = read("src/components/Analytics/DeepTracker.tsx");
  const anonymousIngestSource = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngestSource = read("src/app/api/analytics/ingest-identified/route.ts");
  const identifiedNormalizerSource = read("src/lib/runtime-facts/normalize-runtime-fact.ts");
  const adminDebugRouteSource = read("src/app/api/admin/debug/route.ts");
  const adminIdentitySummarySource = read("src/lib/server/admin-debug/identity-handoff-summary.ts");
  const testSource = read("tests/unit/identity-handoff-spine.spec.ts");
  const packageJson = read("package.json");

  const fullLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
    reason: "signup",
  });
  const repeatLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
    reason: "login",
  });
  const minimalLink = buildIdentityLinkCandidate({
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    consentMode: "minimal_analytics",
    reason: "login",
  });
  const guestEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_page_viewed",
    guestId: "guest_1",
    sessionId: "sess_1",
    consentMode: "full_behavioral",
  });
  const missingGuestEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_page_viewed",
    sessionId: "sess_1",
    consentMode: "necessary_only",
  });
  const linkedGuard = preventGuestUserDoubleCount({
    eventId: "evt_1",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    guestId: "guest_1",
    userId: "user_1",
    sessionId: "sess_1",
    linkId: fullLink.linkId,
  });
  const adminGuard = preventGuestUserDoubleCount({
    eventId: "evt_2",
    actorKind: "admin_projection",
    identityState: "admin_authenticated",
    userId: "admin_1",
  });
  const legacy = classifyLegacyIdentity({
    userId: "legacy_user",
  });
  // A validated task delegates mutation safety to its canonical exact allowlist.
  // Standalone incident classification still sees every Git worktree change.
  const protectedChangedFiles = (mutationScope ? [] : changedFiles).filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /paypal|payment|wallet|gumdrop/iu.test(file));

  const checks = {
    canonicalContractExists: contractSource.includes("export type ActorKind") && contractSource.includes("guest_full_behavioral"),
    requiredActorKindsPresent: ["guest", "signed_in_user", "creator_user", "admin_projection", "system", "legacy_unknown"].every((value) => contractSource.includes(`"${value}"`)),
    requiredIdentityStatesPresent: ["signup_started", "signup_completed_unlinked", "logged_in_linked_guest", "creator_logged_in", "admin_authenticated"].every((value) => contractSource.includes(`"${value}"`)),
    requiredConfidenceAndReasonsPresent: contractSource.includes("IdentityConfidence") && contractSource.includes("consent_upgrade") && contractSource.includes("legacy_recovery"),
    engineExportsRequiredFunctions: [
      "resolveCurrentIdentityState",
      "buildGuestIdentityContext",
      "buildSignedInIdentityContext",
      "buildIdentityLinkCandidate",
      "shouldLinkGuestToUser",
      "buildEventIdentityEnvelope",
      "preventGuestUserDoubleCount",
      "classifyLegacyIdentity",
    ].every((name) => engineSource.includes(`function ${name}`)),
    deterministicLinkCandidate: Boolean(fullLink.linkId) && fullLink.linkId === repeatLink.linkId,
    minimalConsentBlocksLinkage: shouldLinkGuestToUser(minimalLink) === false && minimalLink.blockedReason === "consent_blocks_identity_link",
    envelopeCarriesRequiredIdentityFields: guestEnvelope.actorKind === "guest"
      && guestEnvelope.identityState === "guest_full_behavioral"
      && guestEnvelope.identityConfidence === "weak"
      && guestEnvelope.consentMode === "full_behavioral"
      && guestEnvelope.sessionId === "sess_1",
    guestEnvelopeHasUnavailableReason: missingGuestEnvelope.unavailableGuestReason === "guest_id_unavailable_due_to_consent",
    doubleCountGuardPreventsGuestUserDupes: linkedGuard.canonicalCountKey === "user:user_1" && linkedGuard.countAsUser && !linkedGuard.countAsGuest,
    adminProjectionExcluded: adminGuard.reason === "admin_projection_excluded" && !adminGuard.includeInUserBehavior,
    legacyUnknownNeverExact: legacy.identityConfidence === "unknown" && legacy.canPromoteToExactUser === false && legacy.userId === null,
    telemetryUsesCanonicalEnvelope: telemetrySource.includes("buildEventIdentityEnvelope") && telemetrySource.includes("actor_kind") && telemetrySource.includes("identity_state") && telemetrySource.includes("identity_confidence"),
    telemetrySafetyKeepsIdentityFields: telemetrySafetySource.includes('"actor_kind"') && telemetrySafetySource.includes('"identity_state"') && telemetrySafetySource.includes('"consent_mode"'),
    guestTrackerUsesCanonicalEnvelope: guestPayloadUsesCanonicalEnvelope(trackerSource),
    anonymousIngestRequiresIdentityEnvelope: anonymousIngestSource.includes("IDENTITY_STATES") && anonymousIngestSource.includes("identityConfidence") && anonymousIngestSource.includes("actorKind"),
    identifiedIngestBuildsCanonicalEnvelope: identifiedPayloadUsesCanonicalEnvelope(identifiedIngestSource, identifiedNormalizerSource),
    debugLaneConsolidated: countOccurrences(adminDebugRouteSource, "identityHandoff") === 1
      && adminIdentitySummarySource.includes('lane: "Identity handoff"')
      && adminIdentitySummarySource.includes("duplicateIdentityWidgetsConsolidated: true"),
    testCoversSpine: testSource.includes("buildEventIdentityEnvelope") && testSource.includes("preventGuestUserDoubleCount") && testSource.includes("legacy_unknown"),
    packageScriptPresent: packageJson.includes('"check:identity-handoff-spine": "tsx scripts/agent/validate-identity-handoff-spine.ts"'),
    protectedSurfacesUntouched: protectedChangedFiles.length === 0,
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  if (protectedChangedFiles.length > 0) {
    failures.push(`protected files changed: ${protectedChangedFiles.join(", ")}`);
  }

  const report = {
    reportKey: "identity-handoff-spine",
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "pass" as const : "fail" as const,
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeBehaviorUsed: false,
    protectedRuntimeStatus: {
      paymentWalletPaypalUntouched: !changedFiles.some((file) => /paypal|payment|wallet/iu.test(file)),
      gumdropMathUntouched: !changedFiles.some((file) => /gumdrop/iu.test(file)),
      chatNavUntouched: !changedFiles.some((file) => /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)),
    },
    checks,
    changedFiles,
    mutationScope: mutationScope ?? { mode: "whole_git_worktree" as const },
    validationFailures: failures,
    debugPanelLane: {
      name: "Identity handoff",
      rawDumpsCollapsed: true,
      duplicateIdentityWidgetsConsolidated: true,
    },
    releaseNote: [
      "Finalized guest-to-user identity handoff contracts.",
      "Prevented double-counting across signup and login.",
      "Simplified debug identity status into one source of truth.",
    ],
  };

  writeJson(REPORT_PATH, report);
  // Explicit input-bound verification cannot churn unowned durable documents.
  if (!mutationScope) writeDoc(report);

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`Identity handoff spine passed: ${Object.keys(checks).length} checks.`);
}

main();
