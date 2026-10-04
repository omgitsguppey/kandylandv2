import { existsSync } from "node:fs";
import * as ts from "typescript";
import { MAINTENANCE_SCHEDULES } from "../../shared/runtime/maintenance-mode-contract";
import { USER_INDEX_MATERIALIZER_CONTRACT_VERSION } from "../../src/lib/user-indexes/user-tracking-index-contract";
import { getMaterializationClassification } from "../../src/lib/analytics/materialization-contract";
import { findSourceFunction, someSourceNode, sourceExpressionIs } from "./validate-behavioral-truth-source";

import { ROOT, readText, writeJsonFile } from "./shared";

type ScoreCheck = { id: string; pass: boolean; detail: string };
type ScoreReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  score: number;
  checks: ScoreCheck[];
  criticalBlockers: string[];
  warnings: string[];
  surfacesAffected: string[];
  exactValidatorsToRun: string[];
};

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

/** Inspect the connected scheduled export and decoder; comments and unused tokens do not satisfy these gates. */
export function inspectUserIndexMaterializerSource(input: {
  scheduledConsumer: string;
  materializerVersion: string;
  canonicalSchedule: { schedule: string; maxInstances: number; maintenanceAllowed: boolean };
  registryNotes: string;
}) {
  const source = ts.createSourceFile("user-index-materializer-schedule.ts", input.scheduledConsumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (((source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length ?? 0) > 0) {
    return { scheduleCapacityBound: false, receiptVersionBound: false, registryVersionBound: false };
  }
  const imports = source.statements.filter(ts.isImportDeclaration);
  const binding = (moduleName: string, exportName: string) => imports.flatMap(statement => {
    if (!ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) return [];
    const names = statement.importClause?.namedBindings;
    if (!names || !ts.isNamedImports(names)) return [];
    return names.elements.filter(element => (element.propertyName?.text ?? element.name.text) === exportName).map(element => element.name.text);
  })[0];
  const scheduleName = binding("../../shared/runtime/maintenance-mode-contract.js", "MAINTENANCE_SCHEDULES");
  const factoryName = binding("firebase-functions/v2/scheduler", "onSchedule");
  const declarations = source.statements.filter(ts.isVariableStatement).flatMap(statement => statement.declarationList.declarations);
  const endpoint = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "materializeUserTrackingIndexes")?.initializer;
  const options = endpoint && ts.isCallExpression(endpoint) && ts.isIdentifier(endpoint.expression) && endpoint.expression.text === factoryName
    && endpoint.arguments[0] && ts.isObjectLiteralExpression(endpoint.arguments[0]) ? endpoint.arguments[0] : undefined;
  const option = (key: string) => options?.properties.find(property => ts.isPropertyAssignment(property)
    && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === key);
  const capacity = option("maxInstances");
  const cadence = option("schedule");
  const scheduleCapacityBound = Boolean(scheduleName && capacity && cadence && ts.isPropertyAssignment(capacity) && ts.isPropertyAssignment(cadence)
    && sourceExpressionIs(capacity.initializer, scheduleName + ".materializeUserTrackingIndexes.maxInstances")
    && sourceExpressionIs(cadence.initializer, scheduleName + ".materializeUserTrackingIndexes.schedule")
    && input.canonicalSchedule.maxInstances === 1 && input.canonicalSchedule.maintenanceAllowed === false
    && input.canonicalSchedule.schedule.trim().length > 0);
  const version = declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "USER_INDEX_MATERIALIZER_VERSION")?.initializer;
  const decoder = findSourceFunction(source, "parseUserIndexReceipt");
  const receiptVersionBound = Boolean(version && ts.isStringLiteral(version) && version.text === input.materializerVersion
    && decoder?.body && ts.isBlock(decoder.body) && decoder.body.statements.some(statement => ts.isIfStatement(statement)
      && someSourceNode(statement.expression, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
        && sourceExpressionIs(node.left, "value.materializerVersion") && sourceExpressionIs(node.right, "USER_INDEX_MATERIALIZER_VERSION"))
      && ts.isReturnStatement(statement.thenStatement) && statement.thenStatement.expression?.kind === ts.SyntaxKind.NullKeyword));
  return { scheduleCapacityBound, receiptVersionBound,
    registryVersionBound: input.registryNotes.includes("user_index_materializer_requests " + input.materializerVersion + " worker") };
}

function main() {
  const contract = read("src/lib/user-indexes/user-tracking-index-contract.ts");
  const normalizer = read("src/lib/user-indexes/user-index-normalizer.ts");
  const writer = read("src/lib/server/user-index-writer.ts");
  const reader = read("src/lib/server/user-index-reader.ts");
  const materializer = read("src/lib/server/user-index-materializer.ts");
  const projectionWriter = read("src/lib/server/behavioral-timeline-writer.ts");
  const guestIngest = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
  const internalRoute = read("src/app/api/internal/analytics/materialize-user-index/route.ts");
  const scheduledConsumer = read("functions/src/user-index-materializer-schedule.ts");
  const materializationRegistry = read("src/lib/analytics/materialization-contract.ts");
  const envExample = read(".env.example");
  const appHosting = read("apphosting.yaml");
  const firestoreIndexes = read("firestore.indexes.json");
  const legacyRegistry = read("src/lib/user-indexes/user-index-legacy-registry.ts");
  const governance = read("src/lib/server/analytics-governance.ts");
  const adminUsersPage = read("src/app/admin/users/page.tsx");
  const adminUserDetailPage = read("src/app/admin/user/[userId]/page.tsx");
  const packageJson = read("package.json");
  const scheduledConsumerDefaultsOff =
    scheduledConsumer.includes("resolveUserIndexMaterializerDispatchMode")
    && scheduledConsumer.includes('normalized === "shadow" || normalized === "active" ? normalized : "off"')
    && scheduledConsumer.includes('if (dispatchMode === "off")');

  const materializerSource = inspectUserIndexMaterializerSource({
    scheduledConsumer, materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    canonicalSchedule: MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes,
    registryNotes: getMaterializationClassification("behavioral_timeline_facts")?.notes ?? "",
  });

  const checks: ScoreCheck[] = [
    { id: "contract_exists", pass: contract.includes("type UserTrackingIndex"), detail: "User tracking index contract exists." },
    { id: "guest_contract_exists", pass: contract.includes("type GuestTrackingIndex"), detail: "Guest tracking index contract exists." },
    { id: "identity_lineage_contract_exists", pass: contract.includes("type IdentityLineageIndex"), detail: "Identity lineage index contract exists." },
    { id: "normalizer_exists", pass: normalizer.includes("buildUserTrackingIndex"), detail: "User index normalizer exists." },
    { id: "writer_exists", pass: writer.includes("writeUserTrackingIndex"), detail: "User index writer exists." },
    { id: "reader_exists", pass: reader.includes("readUserTrackingIndex"), detail: "User index reader exists." },
    { id: "materializer_caps", pass: materializer.includes("USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN") && materializer.includes("USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT") && materializer.includes("runtimeCapMs") && materializer.includes("consumeUserIndexMaterializerOutbox"), detail: "Consumer is bounded by the canonical request, fact, and runtime caps." },
    { id: "atomic_projection_owner", pass: projectionWriter.includes("runTransaction") && projectionWriter.includes("buildUserIndexMaterializerRequests") && projectionWriter.includes("coalesceUserIndexMaterializerOutboxRequest"), detail: "Timeline facts and outbox requests share one canonical transaction owner." },
    { id: "guest_ingest_enqueues_projection", pass: guestIngest.includes("writeBehavioralTimelineProjection") && !guestIngest.includes("await materializeUserTrackingIndexes("), detail: "Guest ingest persists the atomic projection without running the materializer in-request." },
    { id: "identified_ingest_enqueues_projection", pass: identifiedIngest.includes("writeBehavioralTimelineProjection") && !identifiedIngest.includes("await materializeUserTrackingIndexes("), detail: "Identified ingest persists the atomic projection without running the materializer in-request." },
    { id: "internal_consumer_route", pass: internalRoute.includes("consumeUserIndexMaterializerOutbox") && internalRoute.includes("CRON_SECRET") && internalRoute.includes("timingSafeEqual") && internalRoute.includes("readBoundedJsonBody"), detail: "The registered internal consumer route is bounded and service-authenticated." },
    { id: "scheduled_consumer_registered", pass: scheduledConsumer.includes("onSchedule") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_ENDPOINT") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_ALLOWED_HOSTS") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_PATH") && materializerSource.scheduleCapacityBound && materializerSource.receiptVersionBound && scheduledConsumerDefaultsOff, detail: "The scheduled HTTP consumer is exact-path/host allowlisted, serialized, and off by default." },
    { id: "safe_environment_defaults", pass: /^USER_INDEX_MATERIALIZER_MODE=\s*$/mu.test(envExample) && envExample.includes("USER_INDEX_SOURCE_FINGERPRINT=") && envExample.includes("USER_INDEX_MATERIALIZER_ENDPOINT=") && envExample.includes("USER_INDEX_MATERIALIZER_ALLOWED_HOSTS=") && appHosting.includes("USER_INDEX_MATERIALIZER_MODE") && appHosting.includes('value: "off"'), detail: "Environment examples stay value-free, while App Hosting keeps the materializer off and requires explicit endpoint/host configuration before dispatch." },
    { id: "firestore_query_indexes", pass: firestoreIndexes.includes('"fieldPath": "actorUserId"') && firestoreIndexes.includes('"fieldPath": "anonymousVisitorId"') && firestoreIndexes.includes('"fieldPath": "timestampMs"'), detail: "Bounded subject-window queries have source-owned Firestore index declarations." },
    { id: "materialization_registry_updated", pass: materializerSource.registryVersionBound && materializationRegistry.includes("user_tracking_indexes") && materializationRegistry.includes("guest_tracking_indexes"), detail: "The existing materialization registry derives the current worker version and names its serving outputs." },
    { id: "ephemeral_retention_metadata", pass: contract.includes("expiresAtMs") && writer.includes("Timestamp.fromMillis") && writer.includes("USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS"), detail: "Ephemeral requests, shadow publications, and window receipts carry source-owned expiration metadata; deployed TTL enforcement remains external evidence." },
    { id: "governance_collections_updated", pass: governance.includes("user_tracking_indexes") && governance.includes("identity_lineage_indexes") && governance.includes("user_index_materializer_requests") && governance.includes("user_index_materializer_windows"), detail: "Analytics governance contains canonical index and materializer collections." },
    { id: "legacy_paths_blocked", pass: legacyRegistry.includes("status: \"blocked\""), detail: "Legacy tracking registry blocks old paths." },
    { id: "admin_surfaces_source_labels", pass: adminUsersPage.includes("AdminTruthBadge") && adminUserDetailPage.includes("AdminTruthBadge"), detail: "Admin surfaces expose truth/source state." },
    { id: "scripts_wired", pass: packageJson.includes("\"score:user-tracking-indexes\"") && packageJson.includes("\"check:user-tracking-index-cutover\""), detail: "Package scripts wired." },
  ];

  const passCount = checks.filter((check) => check.pass).length;
  const score = Math.round((passCount / checks.length) * 100);
  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);

  const report: ScoreReport = {
    generatedAt: new Date().toISOString(),
    status: criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning",
    score,
    checks,
    criticalBlockers,
    warnings: [],
    surfacesAffected: [
      "analytics ingest routes",
      "user tracking index materializer",
      "admin/recommendation index read models",
    ],
    exactValidatorsToRun: [
      "npm run score:user-tracking-indexes",
      "npm run check:user-tracking-index-cutover",
      "npm run typecheck",
    ],
  };

  writeJsonFile("agent/state/user-tracking-index-cutover.generated.json", report);
  console.log(`User tracking indexes score: ${report.score}/100 (${report.status})`);
}

if (require.main === module) main();
