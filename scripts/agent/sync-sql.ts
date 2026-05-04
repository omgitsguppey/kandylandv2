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

export function syncAgentSqlMirror() {
  buildAgentIndexes();

  const syncRevision = `${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const mirror = buildMirrorRows(syncRevision);
  const generatedAt = nowIso();
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
    cloudSql: {
      location: "us-central1",
      database: "kandydrops_db",
      instanceId: "kandydrops-db",
      billingState: "source_configured_provider_state_unverified",
    },
    generatedAt,
    syncedAt: generatedAt,
    syncRevision,
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
    cloudSql: payload.cloudSql,
    artifacts: mirror.artifactStatus,
  };

  writeJsonFile("agent/state/sql-sync.payload.generated.json", payload);
  writeJsonFile("agent/state/sql-mirror-status.generated.json", status);
  return { payload, status };
}

if (require.main === module) {
  const { payload } = syncAgentSqlMirror();
  validateWithSchema("agent/schemas/retrieval-index.schema.json", readJsonFile("agent/index/retrieval-index.json"));
  console.log(`Agent SQL mirror payload generated for ${payload.artifacts.length} artifacts.`);
}
