import { buildOpenActionsRouteRuntimeCleanupReport, validateOpenActionsRouteRuntimeCleanupReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "Open actions route runtime cleanup",
  "open-actions-route-runtime-cleanup.generated.json",
  "open-actions-route-runtime-cleanup.md",
  buildOpenActionsRouteRuntimeCleanupReport(),
  validateOpenActionsRouteRuntimeCleanupReport,
);
