import { pathToFileURL } from "node:url";

import {
  fileExists,
  getPackageScripts,
  listTrackedFiles,
  nowIso,
  readJsonFile,
  readText,
  writeJsonFile,
  type Json,
} from "./shared";
import {
  resolveTelemetryLaneForEvent,
  type TelemetryDependencyLane,
} from "../../src/lib/analytics/telemetry-dependency-graph";

const REPORT_PATH = "agent/state/signal-telemetry-graph.generated.json";
const MAX_EXAMPLES = 25;
const SOURCE_ROOTS = ["src/", "functions/src/", "shared/", "tests/", "scripts/agent/"] as const;
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const TELEMETRY_CATALOG_PATH = "src/lib/telemetry-catalog.ts";
const SURFACE_CATALOG_PATH = "src/lib/analytics/telemetry/surface-telemetry-catalog-events.ts";
const PERSON_METRICS_PATH = "src/lib/analytics/person-metrics-contract.ts";
const TELEMETRY_DEPENDENCY_GRAPH_PATH = "src/lib/analytics/telemetry-dependency-graph.ts";
const IDENTITY_HANDOFF_CONTRACT_PATH = "src/lib/analytics/identity-handoff-contract.ts";
const IDENTITY_HANDOFF_ENGINE_PATH = "src/lib/analytics/identity-handoff-engine.ts";
const IDENTITY_CHAIN_CONTRACT_PATH = "src/lib/identity-truth/identity-chain-contract.ts";
const FUNCTIONS_CALLABLE_EVENT_FACTS_PATH = "functions/src/analytics-event-facts.ts";
const INTENT_ALIASES_PATH = "src/lib/analytics/telemetry-intent-aliases.ts";
const EVENT_TRANSLATION_BRIDGE_PATH = "src/lib/analytics/event-translation-bridge.ts";
const DEBUG_EVIDENCE_CONTRACT_PATH = "src/lib/debug-evidence-contract.ts";
const DIAGNOSTICS_ONLY_EVENT_OWNERS = {
  admin_ui_error: {
    owner: "identified ingest legacy diagnostics",
    file: "src/app/api/analytics/ingest-identified/route.ts",
    validator: "tests/unit/analytics-ingest-identified-route.spec.ts",
  },
} as const;
const SKIP_PATH_PARTS = [
  "/node_modules/",
  "/.next/",
  "/coverage/",
  "/playwright-report/",
  "/test-results/",
  "/lighthouse-results/",
  "/storybook-static/",
  "/dist/",
  "/build/",
  "/out/",
] as const;
const TELEMETRY_GAP_CLASSIFICATIONS = [
  "event_missing",
  "actor_missing",
  "consent_blocked",
  "identity_link_missing",
  "materializer_missing",
  "debug_lane_missing",
  "runtime_unproven",
  "external_provider_unproven",
] as const;

type RepoInventoryItem = {
  path: string;
  generated?: boolean;
  evidence_only?: boolean;
  last_modified_or_hash?: string;
};

type CatalogRowNode = {
  id: string;
  eventName: string;
  source: "telemetry_catalog" | "surface_telemetry_catalog";
  category?: string;
  surface?: string;
  consentRequirement?: string;
  identityRequirement?: string;
  persistenceLane?: string;
  materializerLane?: string;
  owner?: string;
  debugVisibility?: string;
  aliases: string[];
  file: string;
};

type EmitterNode = {
  id: string;
  eventName: string;
  file: string;
  callKind: "trackEvent_literal" | "eventName_assignment" | "telemetry_helper_reference";
  catalogStatus: "cataloged" | "alias_only" | "diagnostics_only" | "uncataloged";
};

type RouteNode = {
  id: string;
  path: string;
  kind: "analytics_ingestion_route" | "admin_analytics_route" | "debug_evidence_route" | "activity_route";
  references: string[];
};

type MetricNode = {
  id: string;
  metricId: string;
  file: string;
  eventNames: string[];
  materializer?: string;
  debugOwner?: string;
};

type ConsumerNode = {
  id: string;
  path: string;
  kind: "admin_panel_consumer" | "user_person_metric_consumer" | "debug_evidence_consumer" | "validator_test";
  references: string[];
};

type EvidenceReportNode = {
  id: string;
  path: string;
  evidenceKind: "generated_snapshot";
  freshness: "current_unknown" | "stale_relative_to_touched";
};

type TelemetryGapClassification =
  (typeof TELEMETRY_GAP_CLASSIFICATIONS)[number];

type DependencyPathNode = {
  id: string;
  eventName: string;
  surface: string;
  actorType: string;
  identityLink: {
    requiredFields: string[];
    state: "linked" | "guest_or_session" | "signed_in_user" | "admin_or_system" | "not_applicable" | "unknown";
  };
  consentPrivacyGate: {
    requirement: string;
    consentAware: boolean;
    privacyClass: "first_party_product_truth" | "external_evidence_only" | "source_only";
  };
  ingestionPath: {
    laneId: string;
    routeApi: string;
    persistenceDestination: string;
    state: TelemetryDependencyLane["destinationState"];
  };
  materializerRollup: {
    lane: string;
    destination: string;
    hasPersonMetric: boolean;
  };
  debugAdminDisplay: {
    visibility: string;
    consumer: string;
    debugLaneConnected: boolean;
  };
  evidenceStatus: {
    sourceOnly: boolean;
    runtimeProven: boolean;
    externalProviderProven: boolean;
  };
  gapClassifications: TelemetryGapClassification[];
};

type TelemetryGraphEdge = {
  from: string;
  to: string;
  kind:
    | "emits"
    | "aliases_to"
    | "ingests"
    | "normalizes_to"
    | "materializes"
    | "hydrates"
    | "displays"
    | "diagnoses"
    | "validates"
    | "stale_after";
  evidenceKind: "source" | "generated_snapshot";
  confidence: "high" | "medium" | "low";
};

type TelemetryGraphFinding = {
  id: string;
  classification:
    | TelemetryGapClassification
    | "disconnected_emitter"
    | "disconnected_ingestion"
    | "disconnected_materializer"
    | "duplicate_intent"
    | "stale_generated_evidence"
    | "source_only_proof_risk"
    | "missing_admin_debug_consumer"
    | "false_positive_manual_review";
  risk: "low" | "medium" | "high";
  title: string;
  affectedFiles: string[];
  evidenceKind: "source" | "generated_snapshot";
  recommendedNextAction: string;
  minimalVerification: string[];
};

type SignalTelemetryGraphReport = {
  schemaVersion: "signal.telemetry-graph.v1";
  generatedAtUtc: string;
  reportPath: typeof REPORT_PATH;
  sourceInputs: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: {
    catalogedEventCount: number;
    emittedEventCount: number;
    uncatalogedEmissionCount: number;
    aliasOnlyEmissionCount: number;
    directTrackEventFileCount: number;
    noncanonicalTelemetryCallCount: number;
    ingestionRouteCount: number;
    personMetricCount: number;
    adminConsumerCount: number;
    debugConsumerCount: number;
    validatorConsumerCount: number;
    generatedEvidenceReportCount: number;
    staleGeneratedEvidenceCount: number;
    dependencyPathCount: number;
    runtimeUnprovenPathCount: number;
    externalProviderUnprovenPathCount: number;
    findingCount: number;
    byFindingClassification: Record<string, number>;
    byGapClassification: Record<string, number>;
  };
  nodes: {
    catalogRows: { count: number; examples: CatalogRowNode[] };
    emitters: { count: number; examples: EmitterNode[] };
    ingestionRoutes: { count: number; examples: RouteNode[] };
    personMetrics: { count: number; examples: MetricNode[] };
    consumers: { count: number; examples: ConsumerNode[] };
    generatedEvidenceReports: { count: number; examples: EvidenceReportNode[] };
    dependencyPaths: { count: number; examples: DependencyPathNode[] };
  };
  edges: {
    count: number;
    byKind: Record<string, number>;
    examples: TelemetryGraphEdge[];
  };
  findings: TelemetryGraphFinding[];
};

type SignalTelemetryGraphInput = {
  trackedFiles: string[];
  inventoryItems: RepoInventoryItem[];
  packageScripts: Record<string, string>;
};

function normalizePath(repoPath: string) {
  return repoPath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function isSkippedPath(repoPath: string) {
  const normalized = `/${normalizePath(repoPath)}`;
  return SKIP_PATH_PARTS.some((part) => normalized.includes(part));
}

function isSourcePath(repoPath: string) {
  const normalized = normalizePath(repoPath);
  return SOURCE_ROOTS.some((root) => normalized.startsWith(root)) && SOURCE_EXTENSIONS.some((extension) => normalized.endsWith(extension)) && !isSkippedPath(normalized);
}

function cap<T>(values: T[], max = MAX_EXAMPLES) {
  return values.slice(0, max);
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

function stableId(kind: string, value: string) {
  return `${kind}:${value.toLowerCase().replace(/[^a-z0-9/_-]+/gu, "-").replace(/[\\/]+/gu, "__")}`;
}

function extractQuotedStrings(value: string) {
  return Array.from(value.matchAll(/["']([a-z][a-z0-9_:-]+)["']/giu), (match) => match[1]);
}

function extractArrayValues(block: string, property: string) {
  const match = new RegExp(`${property}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "u").exec(block);
  return match ? unique(extractQuotedStrings(match[1])) : [];
}

function extractNearbyBlock(source: string, index: number, maxLength = 900) {
  return source.slice(index, Math.min(source.length, index + maxLength));
}

function extractBaseCatalogRows(source: string): CatalogRowNode[] {
  const rows = new Map<string, CatalogRowNode>();
  let match: RegExpExecArray | null;
  const pattern = /eventName:\s*["']([^"']+)["']/gu;
  while ((match = pattern.exec(source)) !== null) {
    const eventName = match[1];
    const block = extractNearbyBlock(source, match.index);
    const category = /category:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const surface = /surface:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const consentRequirement = /consentRequirement:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const identityRequirement = /identityRequirement:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const persistenceLane = /persistenceLane:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const materializerLane = /materializerLane:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const owner = /owner:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const debugVisibility = /debugVisibility:\s*["']([^"']+)["']/u.exec(block)?.[1];
    rows.set(eventName, {
      id: stableId("catalog", eventName),
      eventName,
      source: "telemetry_catalog",
      ...(category ? { category } : {}),
      ...(surface ? { surface } : {}),
      ...(consentRequirement ? { consentRequirement } : {}),
      ...(identityRequirement ? { identityRequirement } : {}),
      ...(persistenceLane ? { persistenceLane } : {}),
      ...(materializerLane ? { materializerLane } : {}),
      ...(owner ? { owner } : {}),
      ...(debugVisibility ? { debugVisibility } : {}),
      aliases: extractArrayValues(block, "aliases"),
      file: TELEMETRY_CATALOG_PATH,
    });
  }
  return Array.from(rows.values()).sort((left, right) => left.eventName.localeCompare(right.eventName));
}

function extractSurfaceCatalogRows(source: string): CatalogRowNode[] {
  const kindsMatch = /SURFACE_TELEMETRY_CATALOG_EVENT_KINDS\s*=\s*\[([\s\S]*?)\]/u.exec(source);
  const kinds = kindsMatch ? extractQuotedStrings(kindsMatch[1]).filter((value) => value.startsWith("surface_")) : [];
  const rows = new Map<string, CatalogRowNode>();
  const surfacePattern = /\{\s*surfaceId:\s*["']([^"']+)["']([\s\S]*?)aliasesByKind:\s*\{([\s\S]*?)\n\s*\},\n\s*\},/gu;
  let match: RegExpExecArray | null;
  while ((match = surfacePattern.exec(source)) !== null) {
    const surfaceId = match[1];
    const surfaceBlock = match[2];
    const aliasBlock = match[3];
    const category = /category:\s*["']([^"']+)["']/u.exec(surfaceBlock)?.[1];
    for (const kind of kinds) {
      const aliasMatch = new RegExp(`${kind}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "u").exec(aliasBlock);
      const eventName = `${surfaceId}_${kind}`;
      rows.set(eventName, {
        id: stableId("catalog", eventName),
        eventName,
        source: "surface_telemetry_catalog",
        ...(category ? { category } : {}),
        surface: surfaceId,
        aliases: aliasMatch ? unique(extractQuotedStrings(aliasMatch[1])) : [],
        file: SURFACE_CATALOG_PATH,
      });
    }
  }
  return Array.from(rows.values()).sort((left, right) => left.eventName.localeCompare(right.eventName));
}

function extractIntentAliasGroups(source: string) {
  const groups: Array<{ events: string[]; file: string }> = [];
  const pattern = /eventNames:\s*\[([\s\S]*?)\][\s\S]*?dedupePolicy:/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const events = unique(extractQuotedStrings(match[1]));
    if (events.length > 1) {
      groups.push({ events, file: INTENT_ALIASES_PATH });
    }
  }
  return groups;
}

function extractEmitterNodes(sourceFiles: string[], catalogNames: Set<string>, aliasToCanonical: Map<string, string>) {
  const emitters: EmitterNode[] = [];
  const directTrackEventFiles = new Set<string>();
  const noncanonicalFiles = new Set<string>();

  for (const file of sourceFiles) {
    if (!fileExists(file)) continue;
    const source = readText(file);
    const directTrackMatches = Array.from(source.matchAll(/\btrackEvent\s*\(\s*["']([^"']+)["']/gu));
    const eventNameMatches = Array.from(source.matchAll(/\beventName\s*:\s*["']([^"']+)["']/gu));
    const helperReferences = Array.from(source.matchAll(/\b(?:sendTelemetryEvent|recordTelemetryEvent|recordDebugEvidence|trackTelemetry)\s*\(\s*["']([^"']+)["']/gu));

    if (directTrackMatches.length > 0) directTrackEventFiles.add(file);
    if (/\b(?:gtag|window\.gtag|posthog\.capture|analytics\.track)\s*\(/u.test(source)) noncanonicalFiles.add(file);

    const addEmitter = (eventName: string, callKind: EmitterNode["callKind"]) => {
      if (!/^[a-z][a-z0-9_:-]+$/u.test(eventName)) return;
      emitters.push({
        id: stableId("emitter", `${file}:${callKind}:${eventName}`),
        eventName,
        file,
        callKind,
        catalogStatus: catalogNames.has(eventName)
          ? "cataloged"
          : aliasToCanonical.has(eventName)
            ? "alias_only"
            : eventName in DIAGNOSTICS_ONLY_EVENT_OWNERS
              ? "diagnostics_only"
              : "uncataloged",
      });
    };

    for (const match of directTrackMatches) addEmitter(match[1], "trackEvent_literal");
    for (const match of eventNameMatches) addEmitter(match[1], "eventName_assignment");
    for (const match of helperReferences) addEmitter(match[1], "telemetry_helper_reference");
  }

  return {
    emitters: emitters.sort((left, right) => left.eventName.localeCompare(right.eventName) || left.file.localeCompare(right.file)),
    directTrackEventFiles,
    noncanonicalFiles,
  };
}

function classifyRoute(repoPath: string): RouteNode["kind"] | null {
  if (!repoPath.startsWith("src/app/api/") || !repoPath.endsWith("/route.ts")) return null;
  if (repoPath.includes("/analytics/ingest")) return "analytics_ingestion_route";
  if (repoPath.includes("/admin/analytics")) return "admin_analytics_route";
  if (repoPath.includes("/debug/") || repoPath.includes("/bug-reports/")) return "debug_evidence_route";
  if (repoPath.includes("/user/activity") || repoPath.includes("/viewer/watch-session") || repoPath.includes("/drops/track")) return "activity_route";
  return null;
}

function extractRouteNodes(sourceFiles: string[]) {
  return sourceFiles
    .filter((file) => classifyRoute(file))
    .map((file) => {
      const source = readText(file);
      return {
        id: stableId("route", file),
        path: file,
        kind: classifyRoute(file) as RouteNode["kind"],
        references: cap(unique(extractQuotedStrings(source).filter((value) => /analytics|telemetry|debug|event|metric|activity|identity/u.test(value))), 12),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function extractPersonMetricNodes(source: string) {
  const metrics: MetricNode[] = [];
  const pattern = /metric\(\s*\{([\s\S]*?)\n\s*\}\),/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const block = match[1];
    const metricId = /\bid:\s*["']([^"']+)["']/u.exec(block)?.[1];
    if (!metricId) continue;
    const materializer = /\bmaterializer:\s*["']([^"']+)["']/u.exec(block)?.[1];
    const debugOwner = /\bdebugOwner:\s*["']([^"']+)["']/u.exec(block)?.[1];
    metrics.push({
      id: stableId("person-metric", metricId),
      metricId,
      file: PERSON_METRICS_PATH,
      eventNames: extractArrayValues(block, "eventNames"),
      ...(materializer ? { materializer } : {}),
      ...(debugOwner ? { debugOwner } : {}),
    });
  }
  return metrics.sort((left, right) => left.metricId.localeCompare(right.metricId));
}

function extractConsumerNodes(sourceFiles: string[], eventNames: Set<string>, metricIds: Set<string>) {
  const consumers: ConsumerNode[] = [];
  for (const file of sourceFiles) {
    if (!fileExists(file)) continue;
    const source = readText(file);
    const strings = unique(extractQuotedStrings(source));
    const references = strings.filter((value) => eventNames.has(value) || metricIds.has(value) || value.startsWith("person_metrics.") || /source_missing|bridge_missing|materializer_missing|proven_zero/u.test(value));
    const isAdminPanel = file.startsWith("src/app/admin/analytics/") || file.startsWith("src/app/admin/debug/") || file.includes("admin-analytics") || file.includes("admin-debug");
    const isDebugConsumer = file.includes("/debug") || file.includes("debug-") || source.includes("debugEvidence") || source.includes("DebugEvidence");
    const isTest = file.startsWith("tests/") || file.endsWith(".spec.ts") || file.endsWith(".test.ts") || file.startsWith("scripts/agent/validate-");
    const isPersonMetricConsumer = source.includes("PERSON_METRIC") || source.includes("person_metrics.") || source.includes("PersonMetric");

    const addConsumer = (kind: ConsumerNode["kind"]) => {
      consumers.push({
        id: stableId(kind, file),
        path: file,
        kind,
        references: cap(references, 12),
      });
    };

    if (isAdminPanel) addConsumer("admin_panel_consumer");
    if (isPersonMetricConsumer) addConsumer("user_person_metric_consumer");
    if (isDebugConsumer) addConsumer("debug_evidence_consumer");
    if (isTest && (references.length > 0 || /telemetry|analytics|identity|person.metric|debug.evidence/iu.test(source))) addConsumer("validator_test");
  }
  return consumers.sort((left, right) => left.kind.localeCompare(right.kind) || left.path.localeCompare(right.path));
}

function extractGeneratedEvidenceReports(trackedFiles: string[], inventoryItems: RepoInventoryItem[]) {
  const touchedMarkers = inventoryItems
    .filter((item) => !item.generated && !item.evidence_only)
    .map((item) => Number((item.last_modified_or_hash ?? "").split(":")[0]))
    .filter((value) => Number.isFinite(value));
  const newestSourceMarker = touchedMarkers.length ? Math.max(...touchedMarkers) : 0;
  const inventoryByPath = new Map(inventoryItems.map((item) => [normalizePath(item.path), item]));

  return trackedFiles
    .filter((file) => file.startsWith("agent/state/"))
    .filter((file) => /telemetry|analytics|identity|debug/u.test(file))
    .map((file) => {
      const marker = Number((inventoryByPath.get(file)?.last_modified_or_hash ?? "").split(":")[0]);
      return {
        id: stableId("generated-report", file),
        path: file,
        evidenceKind: "generated_snapshot" as const,
        freshness: newestSourceMarker > 0 && Number.isFinite(marker) && marker < newestSourceMarker ? "stale_relative_to_touched" as const : "current_unknown" as const,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function actorTypeForRow(row: CatalogRowNode, lane?: TelemetryDependencyLane) {
  const identity = `${row.identityRequirement ?? ""} ${lane?.requiredIdentityFields.join(" ") ?? ""} ${row.eventName}`.toLowerCase();
  if (/admin|operator|system/u.test(identity)) return "admin_or_system";
  if (/creator/u.test(identity)) return "creator_role";
  if (/linked|person|identity_link/u.test(identity)) return "linked_person";
  if (/actoruserid|signed|user/u.test(identity)) return "signed_in_user";
  if (/anonymous|guest|session/u.test(identity)) return "guest_or_session";
  return "unknown";
}

function identityStateForActor(actorType: string): DependencyPathNode["identityLink"]["state"] {
  if (actorType === "linked_person") return "linked";
  if (actorType === "guest_or_session") return "guest_or_session";
  if (actorType === "signed_in_user" || actorType === "creator_role") return "signed_in_user";
  if (actorType === "admin_or_system") return "admin_or_system";
  return "unknown";
}

function buildDependencyPaths(catalogRows: CatalogRowNode[], metrics: MetricNode[], consumers: ConsumerNode[]) {
  const metricEvents = new Set(metrics.flatMap((metric) => metric.eventNames));
  const consumerReferences = new Set(consumers.flatMap((consumer) => consumer.references));
  const paths: DependencyPathNode[] = [];

  for (const row of catalogRows) {
    const lane = resolveTelemetryLaneForEvent({ eventName: row.eventName });
    const actorType = actorTypeForRow(row, lane);
    const hasPersonMetric = metricEvents.has(row.eventName);
    const debugLaneConnected = Boolean(row.debugVisibility || lane?.adminEvidenceConsumer || consumerReferences.has(row.eventName));
    const consentAware = Boolean(row.consentRequirement || lane?.requiredIdentityFields.some((field) => /consent/u.test(field)) || lane?.disabledBehavior.toLowerCase().includes("consent"));
    const privacyClass: DependencyPathNode["consentPrivacyGate"]["privacyClass"] = lane?.evidenceOnly
      ? "external_evidence_only"
      : lane?.productTruth
        ? "first_party_product_truth"
        : "source_only";
    const gapClassifications: TelemetryGapClassification[] = [];

    if (!lane) gapClassifications.push("event_missing");
    if (actorType === "unknown") gapClassifications.push("actor_missing");
    if (consentAware && /denied|blocked|skip|disabled/u.test(lane?.disabledBehavior ?? "")) gapClassifications.push("consent_blocked");
    if ((actorType === "linked_person" || row.eventName.includes("identity")) && !hasPersonMetric && lane?.id !== "identity_link") gapClassifications.push("identity_link_missing");
    if (!hasPersonMetric && !row.materializerLane && lane?.costPriority !== "evidence_only" && !/admin|system|security/u.test(row.category ?? "")) {
      gapClassifications.push("materializer_missing");
    }
    if (!debugLaneConnected) gapClassifications.push("debug_lane_missing");
    if (lane?.sourceReadyButNotTracked || lane?.destinationState === "queued") gapClassifications.push("runtime_unproven");
    if (lane?.evidenceOnly || lane?.destinationState === "external_evidence_only") gapClassifications.push("external_provider_unproven");

    paths.push({
      id: stableId("dependency-path", row.eventName),
      eventName: row.eventName,
      surface: row.surface ?? row.category ?? "unknown",
      actorType,
      identityLink: {
        requiredFields: lane?.requiredIdentityFields ?? [],
        state: identityStateForActor(actorType),
      },
      consentPrivacyGate: {
        requirement: row.consentRequirement ?? (consentAware ? "consent-aware lane" : "unspecified"),
        consentAware,
        privacyClass,
      },
      ingestionPath: {
        laneId: lane?.id ?? "unmapped",
        routeApi: lane?.routeApi ?? "unmapped",
        persistenceDestination: lane?.persistenceDestination ?? "unmapped",
        state: lane?.destinationState ?? "queued",
      },
      materializerRollup: {
        lane: row.materializerLane ?? lane?.materializerExportDestination ?? "unspecified",
        destination: lane?.materializerExportDestination ?? "unspecified",
        hasPersonMetric,
      },
      debugAdminDisplay: {
        visibility: row.debugVisibility ?? "unspecified",
        consumer: lane?.adminEvidenceConsumer ?? "unspecified",
        debugLaneConnected,
      },
      evidenceStatus: {
        sourceOnly: true,
        runtimeProven: false,
        externalProviderProven: false,
      },
      gapClassifications: Array.from(new Set(gapClassifications)).sort(),
    });
  }

  return paths.sort((left, right) => left.eventName.localeCompare(right.eventName));
}

function buildEdges(
  catalogRows: CatalogRowNode[],
  emitters: EmitterNode[],
  routes: RouteNode[],
  metrics: MetricNode[],
  consumers: ConsumerNode[],
  reports: EvidenceReportNode[],
  aliasToCanonical: Map<string, string>,
) {
  const eventToCatalog = new Map(catalogRows.map((row) => [row.eventName, row.id]));
  const metricByEvent = new Map<string, MetricNode[]>();
  for (const metric of metrics) {
    for (const eventName of metric.eventNames) {
      const entries = metricByEvent.get(eventName) ?? [];
      entries.push(metric);
      metricByEvent.set(eventName, entries);
    }
  }

  const edges: TelemetryGraphEdge[] = [];
  const push = (edge: TelemetryGraphEdge) => edges.push(edge);

  for (const emitter of emitters) {
    const catalogId = eventToCatalog.get(emitter.eventName) ?? eventToCatalog.get(aliasToCanonical.get(emitter.eventName) ?? "");
    if (catalogId) {
      push({ from: emitter.id, to: catalogId, kind: "emits", evidenceKind: "source", confidence: emitter.catalogStatus === "cataloged" ? "high" : "medium" });
    }
    const canonical = aliasToCanonical.get(emitter.eventName);
    if (canonical && eventToCatalog.has(canonical)) {
      push({ from: emitter.id, to: eventToCatalog.get(canonical) as string, kind: "aliases_to", evidenceKind: "source", confidence: "high" });
    }
    for (const metric of metricByEvent.get(emitter.eventName) ?? []) {
      push({ from: emitter.id, to: metric.id, kind: "materializes", evidenceKind: "source", confidence: "medium" });
    }
  }

  for (const route of routes) {
    const targetKind: TelemetryGraphEdge["kind"] = route.kind === "analytics_ingestion_route" ? "ingests" : route.kind === "debug_evidence_route" ? "diagnoses" : "normalizes_to";
    for (const row of cap(catalogRows.filter((catalog) => route.references.includes(catalog.eventName)), 20)) {
      push({ from: row.id, to: route.id, kind: targetKind, evidenceKind: "source", confidence: "medium" });
    }
  }

  for (const metric of metrics) {
    for (const consumer of consumers.filter((entry) => entry.references.includes(metric.metricId) || entry.references.includes(metric.materializer ?? ""))) {
      push({ from: metric.id, to: consumer.id, kind: consumer.kind === "validator_test" ? "validates" : "hydrates", evidenceKind: "source", confidence: "medium" });
    }
  }

  for (const report of reports) {
    for (const consumer of cap(consumers.filter((entry) => entry.path.includes("admin") || entry.path.includes("debug")), 5)) {
      push({ from: report.id, to: consumer.id, kind: "diagnoses", evidenceKind: "generated_snapshot", confidence: "low" });
    }
    if (report.freshness === "stale_relative_to_touched") {
      push({ from: report.id, to: report.id, kind: "stale_after", evidenceKind: "generated_snapshot", confidence: "medium" });
    }
  }

  return edges;
}

function buildFindings(
  catalogRows: CatalogRowNode[],
  emitters: EmitterNode[],
  metrics: MetricNode[],
  consumers: ConsumerNode[],
  reports: EvidenceReportNode[],
  dependencyPaths: DependencyPathNode[],
  directNoncanonicalFiles: Set<string>,
) {
  const findings: TelemetryGraphFinding[] = [];
  const catalogNames = new Set(catalogRows.map((row) => row.eventName));
  const emittedNames = new Set(emitters.map((emitter) => emitter.eventName));
  const metricEvents = new Set(metrics.flatMap((metric) => metric.eventNames));
  const validatorReferences = new Set(consumers.filter((consumer) => consumer.kind === "validator_test").flatMap((consumer) => consumer.references));

  for (const emitter of cap(emitters.filter((entry) => entry.catalogStatus === "uncataloged"), 20)) {
    findings.push({
      id: stableId("finding", `uncataloged:${emitter.eventName}:${emitter.file}`),
      classification: "disconnected_emitter",
      risk: emitter.file.startsWith("tests/") ? "low" : "medium",
      title: `Emitted telemetry event is not cataloged: ${emitter.eventName}`,
      affectedFiles: [emitter.file],
      evidenceKind: "source",
      recommendedNextAction: "Confirm whether this is test-only, legacy recovery, or should be added through the canonical telemetry catalog owner.",
      minimalVerification: ["npm run check:telemetry"],
    });
  }

  for (const emitter of cap(emitters.filter((entry) => entry.catalogStatus === "diagnostics_only"), 10)) {
    const owner = DIAGNOSTICS_ONLY_EVENT_OWNERS[emitter.eventName as keyof typeof DIAGNOSTICS_ONLY_EVENT_OWNERS];
    findings.push({
      id: stableId("finding", `diagnostics-only:${emitter.eventName}:${emitter.file}`),
      classification: "false_positive_manual_review",
      risk: "low",
      title: `Diagnostics-only telemetry event is explicitly owned outside active analytics facts: ${emitter.eventName}`,
      affectedFiles: [emitter.file, owner.file, owner.validator],
      evidenceKind: "source",
      recommendedNextAction: "Keep this event out of the active telemetry catalog unless the diagnostics-only ingest contract intentionally changes.",
      minimalVerification: [`npm run agent:test -- ${owner.validator}`],
    });
  }

  const catalogedNeverSeen = catalogRows
    .filter((row) => !emittedNames.has(row.eventName) && row.aliases.every((alias) => !emittedNames.has(alias)))
    .filter((row) => !row.source.includes("surface"))
    .slice(0, 20);
  for (const row of catalogedNeverSeen) {
    findings.push({
      id: stableId("finding", `catalog-without-emitter:${row.eventName}`),
      classification: "disconnected_ingestion",
      risk: "low",
      title: `Catalog event has no literal emitter in scanned source: ${row.eventName}`,
      affectedFiles: [row.file],
      evidenceKind: "source",
      recommendedNextAction: "Treat as source-only evidence; review dynamic emitters or legacy recovery ownership before cleanup.",
      minimalVerification: ["npm run check:telemetry"],
    });
  }

  const duplicatedMetricIntents = metrics.filter((metric) => metric.eventNames.length > 1);
  for (const metric of cap(duplicatedMetricIntents, 20)) {
    findings.push({
      id: stableId("finding", `multi-event-metric:${metric.metricId}`),
      classification: "duplicate_intent",
      risk: metric.metricId.includes("payment") || metric.metricId.includes("unlock") ? "high" : "medium",
      title: `Person metric consumes multiple event names: ${metric.metricId}`,
      affectedFiles: [metric.file],
      evidenceKind: "source",
      recommendedNextAction: "Verify materializers dedupe aliases and preserve missing-vs-zero state before changing emitters.",
      minimalVerification: ["npm run check:event-translation-bridge", "npm run check:count-deduplication-normalization"],
    });
  }

  for (const metric of cap(metrics.filter((entry) => !entry.materializer || !entry.debugOwner), 20)) {
    findings.push({
      id: stableId("finding", `metric-bridge:${metric.metricId}`),
      classification: "disconnected_materializer",
      risk: "high",
      title: `Person metric lacks materializer/debug owner metadata: ${metric.metricId}`,
      affectedFiles: [metric.file],
      evidenceKind: "source",
      recommendedNextAction: "Repair the canonical person metric contract before admin/user display changes.",
      minimalVerification: ["npm run typecheck"],
    });
  }

  for (const file of cap(Array.from(directNoncanonicalFiles).sort(), 20)) {
    findings.push({
      id: stableId("finding", `noncanonical-call:${file}`),
      classification: "source_only_proof_risk",
      risk: "medium",
      title: "Source file appears to call a raw telemetry provider directly.",
      affectedFiles: [file],
      evidenceKind: "source",
      recommendedNextAction: "Confirm whether this bypasses the canonical telemetry envelope before editing.",
      minimalVerification: ["npm run check:telemetry"],
    });
  }

  for (const eventName of cap(Array.from(metricEvents).filter((eventName) => catalogNames.has(eventName) && !validatorReferences.has(eventName)).sort(), 20)) {
    findings.push({
      id: stableId("finding", `metric-event-without-validator:${eventName}`),
      classification: "missing_admin_debug_consumer",
      risk: "low",
      title: `Metric event has no direct validator reference in scanned tests: ${eventName}`,
      affectedFiles: [PERSON_METRICS_PATH],
      evidenceKind: "source",
      recommendedNextAction: "Use as a test-coverage hint only; dynamic validator coverage may exist.",
      minimalVerification: ["npm run agent:verify -- --paths=src/lib/analytics/person-metrics-contract.ts"],
    });
  }

  for (const report of cap(reports.filter((entry) => entry.freshness === "stale_relative_to_touched"), 20)) {
    findings.push({
      id: stableId("finding", `stale-report:${report.path}`),
      classification: "stale_generated_evidence",
      risk: "low",
      title: "Generated telemetry/analytics evidence predates touched source inventory.",
      affectedFiles: [report.path],
      evidenceKind: "generated_snapshot",
      recommendedNextAction: "Refresh only when the current task consumes this report.",
      minimalVerification: ["npm run check:agent-context"],
    });
  }

  for (const pathNode of cap(dependencyPaths.filter((entry) => entry.gapClassifications.length > 0), 60)) {
    for (const gap of pathNode.gapClassifications) {
      const risk: TelemetryGraphFinding["risk"] =
        gap === "identity_link_missing" || gap === "materializer_missing"
          ? "high"
          : gap === "event_missing" || gap === "debug_lane_missing"
            ? "medium"
            : "low";
      findings.push({
        id: stableId("finding", `dependency-gap:${gap}:${pathNode.eventName}`),
        classification: gap,
        risk,
        title: `Telemetry dependency path has ${gap}: ${pathNode.eventName}`,
        affectedFiles: [TELEMETRY_DEPENDENCY_GRAPH_PATH, TELEMETRY_CATALOG_PATH],
        evidenceKind: "source",
        recommendedNextAction:
          gap === "runtime_unproven" || gap === "external_provider_unproven"
            ? "Keep this as an evidence gate; do not clear it with source-only checks."
            : "Inspect the canonical telemetry dependency lane before changing emitters or materializers.",
        minimalVerification:
          gap === "runtime_unproven" || gap === "external_provider_unproven"
            ? ["manual/operator evidence required; source validators cannot clear runtime proof"]
            : ["npm run check:telemetry-dependency-graph"],
      });
    }
  }

  return findings;
}

export function buildSignalTelemetryGraphReport(input: SignalTelemetryGraphInput): SignalTelemetryGraphReport {
  const trackedFiles = unique(input.trackedFiles.map(normalizePath)).filter((file) => !isSkippedPath(file));
  const sourceFiles = trackedFiles.filter(isSourcePath);
  const catalogRowsByName = new Map<string, CatalogRowNode>();
  for (const row of [
    ...extractBaseCatalogRows(readText(TELEMETRY_CATALOG_PATH)),
    ...extractSurfaceCatalogRows(readText(SURFACE_CATALOG_PATH)),
  ]) {
    catalogRowsByName.set(row.eventName, { ...(catalogRowsByName.get(row.eventName) ?? row), ...row });
  }

  const catalogRows = Array.from(catalogRowsByName.values()).sort((left, right) => left.eventName.localeCompare(right.eventName));
  const aliasToCanonical = new Map<string, string>();
  for (const row of catalogRows) {
    for (const alias of row.aliases) {
      aliasToCanonical.set(alias, row.eventName);
    }
  }
  for (const group of extractIntentAliasGroups(readText(INTENT_ALIASES_PATH))) {
    const canonical = group.events.find((eventName) => catalogRowsByName.has(eventName)) ?? group.events[0];
    for (const eventName of group.events) {
      if (eventName !== canonical) aliasToCanonical.set(eventName, canonical);
    }
  }

  const catalogNames = new Set(catalogRows.map((row) => row.eventName));
  const { emitters, directTrackEventFiles, noncanonicalFiles } = extractEmitterNodes(sourceFiles, catalogNames, aliasToCanonical);
  const routes = extractRouteNodes(sourceFiles);
  const metrics = extractPersonMetricNodes(readText(PERSON_METRICS_PATH));
  const metricIds = new Set(metrics.map((metric) => metric.metricId));
  const eventNames = new Set([...catalogNames, ...emitters.map((emitter) => emitter.eventName), ...metrics.flatMap((metric) => metric.eventNames)]);
  const consumers = extractConsumerNodes(sourceFiles, eventNames, metricIds);
  const reports = extractGeneratedEvidenceReports(trackedFiles, input.inventoryItems);
  const dependencyPaths = buildDependencyPaths(catalogRows, metrics, consumers);
  const edges = buildEdges(catalogRows, emitters, routes, metrics, consumers, reports, aliasToCanonical);
  const findings = buildFindings(catalogRows, emitters, metrics, consumers, reports, dependencyPaths, noncanonicalFiles);

  const edgeByKind: Record<string, number> = {};
  for (const edge of edges) increment(edgeByKind, edge.kind);
  const byFindingClassification: Record<string, number> = {};
  for (const finding of findings) increment(byFindingClassification, finding.classification);
  const byGapClassification: Record<string, number> = Object.fromEntries(TELEMETRY_GAP_CLASSIFICATIONS.map((gap) => [gap, 0]));
  for (const pathNode of dependencyPaths) {
    for (const gap of pathNode.gapClassifications) increment(byGapClassification, gap);
  }

  return {
    schemaVersion: "signal.telemetry-graph.v1",
    generatedAtUtc: nowIso(),
    reportPath: REPORT_PATH,
    sourceInputs: [
      TELEMETRY_CATALOG_PATH,
      SURFACE_CATALOG_PATH,
      PERSON_METRICS_PATH,
      TELEMETRY_DEPENDENCY_GRAPH_PATH,
      IDENTITY_HANDOFF_CONTRACT_PATH,
      IDENTITY_HANDOFF_ENGINE_PATH,
      IDENTITY_CHAIN_CONTRACT_PATH,
      FUNCTIONS_CALLABLE_EVENT_FACTS_PATH,
      INTENT_ALIASES_PATH,
      EVENT_TRANSLATION_BRIDGE_PATH,
      DEBUG_EVIDENCE_CONTRACT_PATH,
      "source files with telemetry emitters, analytics ingestion routes, admin/debug consumers, tests, validators",
      "agent/index/repo-inventory.json",
    ],
    commandBudget: {
      allowedCommands: ["npm run signal:telemetry-graph", "npm run typecheck", "npm run agent:test -- tests/unit/signal-telemetry-graph.spec.ts"],
      forbiddenCommands: ["npm run check", "playwright", "cypress", "lighthouse", "firebase deploy", "gcloud", "provider API calls"],
    },
    summary: {
      catalogedEventCount: catalogRows.length,
      emittedEventCount: emitters.length,
      uncatalogedEmissionCount: emitters.filter((entry) => entry.catalogStatus === "uncataloged").length,
      aliasOnlyEmissionCount: emitters.filter((entry) => entry.catalogStatus === "alias_only").length,
      directTrackEventFileCount: directTrackEventFiles.size,
      noncanonicalTelemetryCallCount: noncanonicalFiles.size,
      ingestionRouteCount: routes.length,
      personMetricCount: metrics.length,
      adminConsumerCount: consumers.filter((consumer) => consumer.kind === "admin_panel_consumer").length,
      debugConsumerCount: consumers.filter((consumer) => consumer.kind === "debug_evidence_consumer").length,
      validatorConsumerCount: consumers.filter((consumer) => consumer.kind === "validator_test").length,
      generatedEvidenceReportCount: reports.length,
      staleGeneratedEvidenceCount: reports.filter((report) => report.freshness === "stale_relative_to_touched").length,
      dependencyPathCount: dependencyPaths.length,
      runtimeUnprovenPathCount: dependencyPaths.filter((entry) => entry.gapClassifications.includes("runtime_unproven")).length,
      externalProviderUnprovenPathCount: dependencyPaths.filter((entry) => entry.gapClassifications.includes("external_provider_unproven")).length,
      findingCount: findings.length,
      byFindingClassification,
      byGapClassification,
    },
    nodes: {
      catalogRows: { count: catalogRows.length, examples: cap(catalogRows) },
      emitters: { count: emitters.length, examples: cap(emitters) },
      ingestionRoutes: { count: routes.length, examples: cap(routes) },
      personMetrics: { count: metrics.length, examples: cap(metrics.map((metric) => ({ ...metric, eventNames: cap(metric.eventNames, 12) }))) },
      consumers: { count: consumers.length, examples: cap(consumers) },
      generatedEvidenceReports: { count: reports.length, examples: cap(reports) },
      dependencyPaths: { count: dependencyPaths.length, examples: cap(dependencyPaths) },
    },
    edges: {
      count: edges.length,
      byKind: edgeByKind,
      examples: cap(edges, 60),
    },
    findings: cap(findings, 120),
  };
}

export function buildSignalTelemetryGraphReportFromRepo() {
  const inventoryItems = readJsonFile<{ items: RepoInventoryItem[] }>("agent/index/repo-inventory.json").items;
  let trackedFiles: string[];
  try {
    trackedFiles = listTrackedFiles();
  } catch (error) {
    trackedFiles = inventoryItems.map((item) => item.path).filter((repoPath) => fileExists(repoPath));
    console.warn(`SIGNAL telemetry graph: git ls-files unavailable, using repo-inventory fallback (${(error as Error).message}).`);
  }

  return buildSignalTelemetryGraphReport({
    trackedFiles,
    inventoryItems,
    packageScripts: getPackageScripts("package.json"),
  });
}

export function main() {
  const report = buildSignalTelemetryGraphReportFromRepo();
  writeJsonFile(REPORT_PATH, report as unknown as Json);
  console.log(
    `SIGNAL telemetry graph: findings=${report.summary.findingCount}, catalogedEvents=${report.summary.catalogedEventCount}, emitters=${report.summary.emittedEventCount}, routes=${report.summary.ingestionRouteCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
