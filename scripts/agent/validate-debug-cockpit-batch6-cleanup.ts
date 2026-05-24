import { buildDebugCockpitBatch6CleanupReport, validateDebugCockpitBatch6CleanupReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "Debug cockpit batch6 cleanup",
  "debug-cockpit-batch6-cleanup.generated.json",
  "debug-cockpit-batch6-cleanup.md",
  buildDebugCockpitBatch6CleanupReport(),
  validateDebugCockpitBatch6CleanupReport,
);
