import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildGeneratedReportCompleteness } from "@/lib/agent-governance/generated-reports/generated-report-contract";
import { buildGeneratedReportSchemaContractReport, validateGeneratedReportSchemaContractReport } from "@/lib/type-hardening/generated-report-schema-contract";

const ROOT = process.cwd();

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildGeneratedReportSchemaContractReport();
const validation = validateGeneratedReportSchemaContractReport(report);
const compact = {
  ...report,
  ...buildGeneratedReportCompleteness({
    totalFindingCount: report.totalFindingCount,
    emittedFindingCount: Math.min(report.typedReportContracts.length, 30) + report.oversizedGeneratedArtifacts.length,
    capLimit: 30,
    capStrategy: report.typedReportContracts.length > 30 ? "top_risk" : "none",
    capReason: report.typedReportContracts.length > 30 ? "compact artifact emits first 30 typed contracts and preserves total/omitted counts" : null,
    rankingInputCompleteness: "complete",
    highRiskCounts: report.highRiskCounts,
  }),
  typedReportContracts: report.typedReportContracts.slice(0, 30),
  validation,
};

write("agent/state/generated-report-schema-contract.generated.json", JSON.stringify(compact));
write("docs/agent-truth/generated-report-schema-contract.md", [
  "# Generated Report Schema Contract",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Generated reports audited: ${report.generatedReportsAudited}`,
  `Typed report contracts: ${report.typedReportContracts.length}`,
  `Oversized type-schema artifacts: ${report.oversizedGeneratedArtifacts.length}`,
  "",
  "## Base Fields",
  "",
  ...report.baseFields.map((field) => `- ${field}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Generated report schema contract passed: reports=${report.generatedReportsAudited}`);
