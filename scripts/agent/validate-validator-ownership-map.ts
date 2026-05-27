import { buildValidatorOwnershipMapReport, validateValidatorOwnershipMapReport } from "@/lib/test-hardening/validator-ownership-map";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildValidatorOwnershipMapReport();
const validation = validateValidatorOwnershipMapReport(report);
const compact = {
  ...report,
  entries: report.entries.slice(0, 40),
  validation,
};

writeCompactJson("agent/state/validator-ownership-map.generated.json", compact);
writeText("docs/agent-truth/validator-ownership-map.md", [
  "# Validator Ownership Map",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Validators audited: ${report.validatorsAudited}`,
  `Validators consolidated: ${report.validatorsConsolidated}`,
  `Validators retired: ${report.validatorsRetired}`,
  `Unclassified validators: ${report.unclassifiedValidators}`,
  "",
  "## Remaining Gaps",
  "",
  ...report.remainingGaps.slice(0, 10).map((gap) => `- ${gap}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Validator ownership map passed: validators=${report.validatorsAudited}`);
