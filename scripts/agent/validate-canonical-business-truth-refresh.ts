import {
  buildCanonicalBusinessTruthRefreshReport,
  validateCanonicalBusinessTruthRefreshReport,
  writeAndValidateReport,
} from "./business-truth-recovery-shared";

const report = buildCanonicalBusinessTruthRefreshReport();
const failures = validateCanonicalBusinessTruthRefreshReport(report);
writeAndValidateReport(
  "agent/state/canonical-business-truth-refresh.generated.json",
  "docs/agent-truth/canonical-business-truth-refresh.md",
  "Canonical Business Truth Refresh",
  report,
  failures,
);
console.log("Canonical business truth refresh validation passed");
