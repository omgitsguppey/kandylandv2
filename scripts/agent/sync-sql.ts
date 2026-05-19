import { createHash } from "node:crypto";

import { buildAgentIndexes } from "./build-agent-indexes";
import { compact, createMetadata, fileExists, nowIso, readJsonFile, toStableId, validateWithSchema, writeJsonFile } from "./shared";

type SqlMirrorArtifact = {
  sourcePath: string;
  sourceHash: string;
  generatedAt: string;
  syncedAt: string;
  syncRevision: string;
  stale: boolean;
  rowCount: number;
};

export type SqlMirrorSyncEnvironment = Record<string, string | undefined>;

export type SqlMirrorSyncGuard = {
  allowed: true;
  dryRun: boolean;
  reason: string;
  syncEnv: "local" | "staging" | "manual";
  providerExecution: "blocked_local_dry_run" | "local_artifact_write_only";
  ciBlockedByDefault: boolean;
};

const SQL_MIRROR_SYNC_ENVIRONMENTS = new Set(["local", "staging", "manual"]);

export function assertSqlMirrorSyncAllowed(env: SqlMirrorSyncEnvironment = process.env): SqlMirrorSyncGuard {
  if (env.ALLOW_SQL_MIRROR_SYNC !== "1") {
    throw new Error(
      "SQL mirror sync is manual-only. Set ALLOW_SQL_MIRROR_SYNC=1, SQL_MIRROR_SYNC_REASON, and SQL_MIRROR_SYNC_ENV=local|staging|manual to run it.",
    );
  }

  const reason = (env.SQL_MIRROR_SYNC_REASON || "").trim();
  if (!reason) {
    throw new Error("SQL_MIRROR_SYNC_REASON is required before agent SQL mirror sync can run.");
  }

  const syncEnv = (env.SQL_MIRROR_SYNC_ENV || "").trim();
  if (!SQL_MIRROR_SYNC_ENVIRONMENTS.has(syncEnv)) {
    throw new Error("SQL_MIRROR_SYNC_ENV must be one of local, staging, or manual before agent SQL mirror sync can run.");
  }

  if (env.CI === "true" && syncEnv !== "manual") {
    throw new Error("SQL mirror sync is blocked in CI unless SQL_MIRROR_SYNC_ENV=manual is explicitly set with approval.");
  }

  const dryRun = env.SQL_MIRROR_DRY_RUN === "1";
  return {
    allowed: true,
    dryRun,
    reason,
    syncEnv: syncEnv as SqlMirrorSyncGuard["syncEnv"],
    providerExecution: dryRun ? "blocked_local_dry_run" : "local_artifact_write_only",
    ciBlockedByDefault: true,
  };
}

function hashValue(value: unknown) {
  return createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
}

function inferRows(fileName: string, payload: Record<string, unknown>) {
  const candidates = ["items", "entries", "commands", "files", "pitfalls", "passes", "domains", "lanes", "highInboundFiles", "blastRadiusSurfaces", "routeHelperAdjacencyHints", "broadChangeDangerMarkers"];
  const primaryKey = candidates.find((key) => Array.isArray(payload[key]));
  if (primaryKey) {
    return (payload[primaryKey] as unknown[]).length;
  }

  if (fileName === "package-manager-truth.json") {
    return 2;
  }

  return 1;
}

function buildMirrorRows(syncRevision: string) {
  const indexFiles = [
    "repo-inventory.json",
    "surface-map.json",
    "canonical-helpers.json",
    "verification-commands.json",
    "package-manager-truth.json",
    "workflow-guidance.json",
    "governance-truth.json",
    "known-pitfalls.json",
    "recent-passes.json",
    "runtime-observability.json",
    "dependency-graph.summary.json",
    "blast-radius.json",
    "retrieval-index.json",
  ];

  const syncedAt = nowIso();
  const rows = indexFiles.map((fileName) => {
    const sourcePath = `agent/index/${fileName}`;
    const payload = readJsonFile<Record<string, unknown>>(sourcePath);
    return {
      stable_id: toStableId("sqlmirror", fileName),
      table_name: fileName.replace(/\.json$/i, "").replace(/[.-]+/g, "_"),
      source_path: sourcePath,
      source_hash: hashValue(payload),
      generated_at: String(payload.generatedAt ?? syncedAt),
      synced_at: syncedAt,
      sync_revision: syncRevision,
      stale: !fileExists(sourcePath),
      row_count: inferRows(fileName, payload),
    };
  });

  const artifactStatus = Object.fromEntries(rows.map((row) => [row.source_path, {
    sourcePath: row.source_path,
    sourceHash: row.source_hash,
    generatedAt: row.generated_at,
    syncedAt: row.synced_at,
    syncRevision: row.sync_revision,
    stale: row.stale,
    rowCount: row.row_count,
  } satisfies SqlMirrorArtifact]));

  return {
    rows,
    artifactStatus,
    mirrorMode: fileExists("dataconnect/schema/agent-context.gql") ? "wired_dataconnect_schema" : "local_only",
  };
}

export function syncAgentSqlMirror(options: {
  env?: SqlMirrorSyncEnvironment;
  now?: () => string;
} = {}) {
  const guard = assertSqlMirrorSyncAllowed(options.env || process.env);
  const generatedAt = options.now?.() || nowIso();
  const syncRevision = `${generatedAt.slice(0, 10)}-${Date.now()}`;

  if (guard.dryRun) {
    const payload = {
      ...createMetadata([
        "agent/index/*.json",
        "firebase.json",
        ".firebase/.graphqlrc",
        "dataconnect/schema/agent-context.gql",
      ]),
      stable_id: toStableId("sqlsync", `dry-run-${syncRevision}`),
      mirrorKind: "sql_dataconnect_agent_context_mirror",
      costClass: "sql_dataconnect_agent_context_mirror",
      mirrorMode: fileExists("dataconnect/schema/agent-context.gql") ? "wired_dataconnect_schema" : "local_only",
      repoTruthPrecedence: "repo_truth_wins_over_sql_mirror",
      allowedUse: "agent_repo_intelligence_mirror_only",
      runtimeUseForbidden: true,
      analyticsEvidenceOnly: true,
      runtimeImportBlocked: true,
      generatedAt,
      syncedAt: generatedAt,
      syncRevision,
      approval: guard,
      dryRun: true,
      writesSkipped: true,
      providerExecution: guard.providerExecution,
      artifacts: [],
      staleArtifacts: [],
    };
    const status = {
      ...createMetadata(["agent/state/sql-sync.payload.generated.json"]),
      stable_id: toStableId("sqlstatus", `dry-run-${syncRevision}`),
      generatedAt,
      syncRevision,
      mirrorKind: payload.mirrorKind,
      costClass: payload.costClass,
      healthy: true,
      allowedUse: payload.allowedUse,
      runtimeUseForbidden: payload.runtimeUseForbidden,
      analyticsEvidenceOnly: payload.analyticsEvidenceOnly,
      runtimeImportBlocked: payload.runtimeImportBlocked,
      approval: guard,
      dryRun: true,
      writesSkipped: true,
      providerExecution: guard.providerExecution,
    };

    return { payload, status, guard, writesSkipped: true };
  }

  buildAgentIndexes();

  const mirror = buildMirrorRows(syncRevision);
  const dataconnectDocuments = compact([
    fileExists("dataconnect/schema/agent-context.gql") ? "dataconnect/schema/agent-context.gql" : null,
    fileExists("dataconnect/example/agent-context.gql") ? "dataconnect/example/agent-context.gql" : null,
  ]);

  const payload = {
    ...createMetadata([
      "agent/index/*.json",
      "firebase.json",
      ".firebase/.graphqlrc",
      ...dataconnectDocuments,
    ]),
    stable_id: toStableId("sqlsync", syncRevision),
    mirrorKind: "sql_dataconnect_agent_context_mirror",
    costClass: "sql_dataconnect_agent_context_mirror",
    mirrorMode: mirror.mirrorMode,
    repoTruthPrecedence: "repo_truth_wins_over_sql_mirror",
    allowedUse: "agent_repo_intelligence_mirror_only",
    runtimeUseForbidden: true,
    analyticsEvidenceOnly: true,
    runtimeImportBlocked: true,
    canonicalFactImportTargets: ["analytics_event_facts", "analytics_metric_facts"],
    forbiddenRuntimeMutationSurfaces: [
      "runtime_balances",
      "runtime_unlocks",
      "runtime_purchases",
      "runtime_user_rollups",
      "legacy_admin_metric_snapshots",
    ],
    cloudSql: {
      location: "us-central1",
      database: "kandydrops_db",
      instanceId: "kandydrops-db",
      billingState: "source_configured_provider_state_unverified",
    },
    generatedAt,
    syncedAt: generatedAt,
    syncRevision,
    approval: guard,
    dryRun: false,
    providerExecution: guard.providerExecution,
    dataconnectSchemaFiles: dataconnectDocuments,
    artifacts: mirror.rows,
    staleArtifacts: mirror.rows.filter((row) => row.stale).map((row) => row.source_path),
  };

  const status = {
    ...createMetadata(["agent/state/sql-sync.payload.generated.json"]),
    stable_id: toStableId("sqlstatus", syncRevision),
    generatedAt,
    syncRevision,
    mirrorMode: mirror.mirrorMode,
    mirrorKind: payload.mirrorKind,
    costClass: payload.costClass,
    healthy: payload.staleArtifacts.length === 0,
    repoTruthPrecedence: payload.repoTruthPrecedence,
    allowedUse: payload.allowedUse,
    runtimeUseForbidden: payload.runtimeUseForbidden,
    analyticsEvidenceOnly: payload.analyticsEvidenceOnly,
    runtimeImportBlocked: payload.runtimeImportBlocked,
    canonicalFactImportTargets: payload.canonicalFactImportTargets,
    forbiddenRuntimeMutationSurfaces: payload.forbiddenRuntimeMutationSurfaces,
    cloudSql: payload.cloudSql,
    approval: guard,
    dryRun: false,
    providerExecution: guard.providerExecution,
    artifacts: mirror.artifactStatus,
  };

  writeJsonFile("agent/state/sql-sync.payload.generated.json", payload);
  writeJsonFile("agent/state/sql-mirror-status.generated.json", status);
  return { payload, status, guard, writesSkipped: false };
}

if (require.main === module) {
  try {
    const { payload, guard } = syncAgentSqlMirror();
    if (!guard.dryRun) {
      validateWithSchema("agent/schemas/retrieval-index.schema.json", readJsonFile("agent/index/retrieval-index.json"));
    }
    console.log(
      guard.dryRun
        ? "Agent SQL mirror dry run passed. No provider calls or artifact writes were performed."
        : `Agent SQL mirror payload generated for ${payload.artifacts.length} artifacts.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
