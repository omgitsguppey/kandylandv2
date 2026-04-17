import { readJsonFile, validateWithSchema } from "./shared";

const REQUIRED_OUTPUTS = [
  ["agent/index/repo-inventory.json", "agent/schemas/repo-inventory.schema.json"],
  ["agent/index/surface-map.json", "agent/schemas/surface-map.schema.json"],
  ["agent/index/canonical-helpers.json", "agent/schemas/canonical-helpers.schema.json"],
  ["agent/index/verification-commands.json", "agent/schemas/verification-commands.schema.json"],
  ["agent/index/package-manager-truth.json", "agent/schemas/package-manager-truth.schema.json"],
  ["agent/index/workflow-guidance.json", "agent/schemas/workflow-guidance.schema.json"],
  ["agent/index/governance-truth.json", "agent/schemas/governance-truth.schema.json"],
  ["agent/index/known-pitfalls.json", "agent/schemas/known-pitfalls.schema.json"],
  ["agent/index/recent-passes.json", "agent/schemas/recent-passes.schema.json"],
  ["agent/index/runtime-observability.json", "agent/schemas/runtime-observability.schema.json"],
  ["agent/index/dependency-graph.summary.json", "agent/schemas/dependency-graph.summary.schema.json"],
  ["agent/index/blast-radius.json", "agent/schemas/blast-radius.schema.json"],
  ["agent/index/retrieval-index.json", "agent/schemas/retrieval-index.schema.json"],
] as const;

export function validateAgentIndexes() {
  REQUIRED_OUTPUTS.forEach(([jsonPath, schemaPath]) => {
    validateWithSchema(schemaPath, readJsonFile(jsonPath));
  });
}

if (require.main === module) {
  validateAgentIndexes();
  console.log("Agent index artifacts are present and schema-valid.");
}
