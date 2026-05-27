import { buildQaHarnessConsolidationReport, validateQaHarnessConsolidationReport } from "@/lib/test-hardening/qa-harness-map";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildQaHarnessConsolidationReport();
const validation = validateQaHarnessConsolidationReport(report);

writeCompactJson("agent/state/qa-harness-consolidation.generated.json", { ...report, validation });
writeText("docs/agent-truth/qa-harness-consolidation.md", [
  "# QA Harness Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Harnesses audited: ${report.harnessesAudited}`,
  `Duplicate harnesses unclassified: ${report.duplicateHarnessesUnclassified}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Harnesses",
  "",
  ...report.harnesses.map((harness) => `- ${harness.harnessId}: ${harness.sourceClass}, ${harness.action}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`QA harness consolidation passed: harnesses=${report.harnessesAudited}`);
