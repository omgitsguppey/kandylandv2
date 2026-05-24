import { buildOpsCanonicalStateCleanupReport, validateOpsCanonicalStateCleanupReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "Ops canonical state cleanup",
  "ops-canonical-state-cleanup.generated.json",
  "ops-canonical-state-cleanup.md",
  buildOpsCanonicalStateCleanupReport(),
  validateOpsCanonicalStateCleanupReport,
);
