import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildTypeSchemaGutConsolidationReport, validateTypeSchemaGutConsolidationReport } from "@/lib/type-hardening/type-schema-gut-consolidation";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildTypeSchemaGutConsolidationReport();
const validation = validateTypeSchemaGutConsolidationReport(report);

write("agent/state/type-schema-gut-consolidation.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/type-schema-gut-consolidation.md", [
  "# Type Schema Gut Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Types audited: ${report.typesAudited}`,
  `Duplicate types found: ${report.duplicateTypesFound}`,
  `Aliases classified: ${report.aliasesCreated}`,
  `Generated report schemas typed: ${report.generatedReportSchemasTyped}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Remaining Gaps",
  "",
  ...report.remainingGaps.map((gap) => `- ${gap}`),
  "",
  "## Next Exact Steps",
  "",
  ...report.nextExactSteps.map((step) => `- ${step}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Type schema gut consolidation passed: types=${report.typesAudited}`);
