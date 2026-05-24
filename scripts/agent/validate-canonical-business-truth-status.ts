import {
  buildCanonicalBusinessTruthStatusReport,
  validateCanonicalBusinessTruthStatusReport,
  writeAndValidateReport,
} from "./business-truth-recovery-shared";

const report = buildCanonicalBusinessTruthStatusReport();
const failures = validateCanonicalBusinessTruthStatusReport(report);
writeAndValidateReport(
  "agent/state/canonical-business-truth-status.generated.json",
  "docs/agent-truth/canonical-business-truth-status.md",
  "Canonical Business Truth Status",
  report,
  failures,
);
console.log("Canonical business truth status validation passed");
