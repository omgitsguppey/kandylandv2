import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildTypeSchemaInventoryReport, validateTypeSchemaInventoryReport } from "@/lib/type-hardening/type-schema-inventory";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildTypeSchemaInventoryReport();
const validation = validateTypeSchemaInventoryReport(report);
const compact = {
  ...report,
  entries: report.entries.slice(0, 25),
  duplicateTypeNames: report.duplicateTypeNames.slice(0, 25),
  validation,
};

write("agent/state/type-schema-inventory.generated.json", JSON.stringify(compact));
write("docs/agent-truth/type-schema-inventory.md", [
  "# Type Schema Inventory",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Types audited: ${report.typesAudited}`,
  `Duplicate type names: ${report.duplicateTypeNames.length}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Top Duplicate Names",
  "",
  ...(report.duplicateTypeNames.slice(0, 10).map((entry) => `- ${entry.name}: ${entry.files.slice(0, 4).join(", ")}`)),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Type schema inventory passed: types=${report.typesAudited} duplicates=${report.duplicateTypeNames.length}`);
