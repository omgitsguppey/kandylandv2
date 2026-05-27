import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildTypeSchemaMemoryWritebackReport, validateTypeSchemaMemoryWritebackReport } from "@/lib/type-hardening/type-schema-memory-writeback";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildTypeSchemaMemoryWritebackReport();
const validation = validateTypeSchemaMemoryWritebackReport(report);

write("agent/state/type-schema-memory-writeback.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/type-schema-memory-writeback.md", [
  "# Type Schema Memory Writeback",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Memory source: ${report.memorySource}`,
  `Entries added: ${report.memoryEntriesAdded}`,
  `Preventing validator: ${report.preventingValidator}`,
  "",
  "## Patterns",
  "",
  ...report.mistakePatternsCaptured.map((pattern) => `- ${pattern}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Type schema memory writeback passed: entries=${report.memoryEntriesAdded}`);
