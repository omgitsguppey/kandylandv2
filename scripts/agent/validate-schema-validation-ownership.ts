import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildSchemaValidationOwnershipReport, validateSchemaValidationOwnershipReport } from "@/lib/type-hardening/schema-validation-ownership";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildSchemaValidationOwnershipReport();
const validation = validateSchemaValidationOwnershipReport(report);

write("agent/state/schema-validation-ownership.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/schema-validation-ownership.md", [
  "# Schema Validation Ownership",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Validators audited: ${report.validatorsAudited}`,
  `Schemas audited: ${report.schemasAudited}`,
  `Manual validators audited: ${report.manualValidatorsAudited}`,
  "",
  "## Rules",
  "",
  ...report.rules.map((rule) => `- ${rule}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Schema validation ownership passed: validators=${report.validatorsAudited}`);
