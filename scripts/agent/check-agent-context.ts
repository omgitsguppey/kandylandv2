import { buildAgentIndexes } from "./build-agent-indexes";
import { buildTaskContext } from "./build-task-context";
import { syncAgentSqlMirror } from "./sync-sql";
import { fileExists, readJsonFile, toAbsoluteRepoPath, validateWithSchema } from "./shared";
import type { RepoInventoryEntry } from "./classify-repo-files";
import type { SqlMirrorSyncEnvironment } from "./sync-sql";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateStableIds(values: Array<{ stable_id: string }>, label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    assert(!seen.has(value.stable_id), `${label}: duplicate stable_id ${value.stable_id}`);
    seen.add(value.stable_id);
  }
}

function validateExistingPaths(paths: string[], label: string) {
  for (const repoPath of paths) {
    assert(fileExists(repoPath), `${label}: missing referenced path ${repoPath}`);
  }
}

export function shouldSyncAgentSqlMirrorDuringCheck(env: SqlMirrorSyncEnvironment = process.env) {
  return env.ALLOW_SQL_MIRROR_SYNC === "1";
}

export function checkAgentContext() {
  buildAgentIndexes();
  const originalArgv = [...process.argv];
  process.argv = [
    process.argv[0] ?? "node",
    process.argv[1] ?? "scripts/agent/check-agent-context.ts",
    "--task=validate repo intelligence fabric outputs",
    "--mode=audit",
    "--file=scripts/agent/build-agent-indexes.ts",
  ];
  buildTaskContext();
  process.argv = originalArgv;
  if (shouldSyncAgentSqlMirrorDuringCheck()) {
    syncAgentSqlMirror();
  }

  const inventory = readJsonFile<{ items: RepoInventoryEntry[] }>("agent/index/repo-inventory.json");
  const helpers = readJsonFile<{ entries: Array<{ stable_id: string; path: string }> }>("agent/index/canonical-helpers.json");
  const workflow = readJsonFile<{ files: Array<{ stable_id: string; path: string }> }>("agent/index/workflow-guidance.json");
  const governance = readJsonFile<{ files: Array<{ stable_id: string; path: string }> }>("agent/index/governance-truth.json");
  const pitfalls = readJsonFile<{ pitfalls: Array<{ stable_id: string; related_helpers: string[] }> }>("agent/index/known-pitfalls.json");
  const taskContext = readJsonFile<Record<string, unknown>>("agent/state/task-context.generated.json");
  const sqlStatus = readJsonFile<{ healthy: boolean; artifacts: Record<string, { stale: boolean }> }>("agent/state/sql-mirror-status.generated.json");

  validateSchema("repo-inventory", "agent/index/repo-inventory.json", inventory);
  validateSchema("canonical-helpers", "agent/index/canonical-helpers.json", helpers);
  validateSchema("workflow-guidance", "agent/index/workflow-guidance.json", workflow);
  validateSchema("governance-truth", "agent/index/governance-truth.json", governance);
  validateSchema("known-pitfalls", "agent/index/known-pitfalls.json", pitfalls);
  validateSchema("task-context", "agent/state/task-context.generated.json", taskContext);

  validateStableIds(inventory.items, "repo-inventory");
  validateStableIds(helpers.entries, "canonical-helpers");
  validateStableIds(workflow.files, "workflow-guidance");
  validateStableIds(governance.files, "governance-truth");
  validateStableIds(pitfalls.pitfalls, "known-pitfalls");

  validateExistingPaths(inventory.items.map((entry) => entry.path), "repo-inventory");
  validateExistingPaths(helpers.entries.map((entry) => entry.path), "canonical-helpers");
  validateExistingPaths(workflow.files.map((entry) => entry.path), "workflow-guidance");
  validateExistingPaths(governance.files.map((entry) => entry.path), "governance-truth");

  for (const pitfall of pitfalls.pitfalls) {
    validateExistingPaths(pitfall.related_helpers, `known-pitfalls:${pitfall.stable_id}`);
  }

  assert(fileExists("agent/prompts/task-prompt.short.md"), "Missing task-prompt.short.md");
  assert(fileExists("agent/prompts/task-prompt.standard.md"), "Missing task-prompt.standard.md");
  assert(fileExists("agent/prompts/task-prompt.deep.md"), "Missing task-prompt.deep.md");
  assert(fileExists("dataconnect/schema/agent-context.gql"), "Missing Data Connect schema for agent context mirror.");
  assert(fileExists("dataconnect/example/agent-context.gql"), "Missing Data Connect document for agent context mirror.");
  assert(sqlStatus.healthy, "SQL mirror status is stale or unhealthy.");
  assert(Object.values(sqlStatus.artifacts).every((artifact) => !artifact.stale), "One or more SQL mirror artifacts are stale.");
  assert(Array.isArray(taskContext.rankingEvidence) && taskContext.rankingEvidence.length > 0, "Task context rankingEvidence must contain at least one ranked entry.");
}

function validateSchema(schemaName: string, repoPath: string, value: unknown) {
  validateWithSchema(`agent/schemas/${schemaName}.schema.json`, value as never);
  assert(fileExists(repoPath), `Missing artifact ${toAbsoluteRepoPath(repoPath)}`);
}

if (require.main === module) {
  checkAgentContext();
  console.log("Agent context check passed.");
}
