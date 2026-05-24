import { buildRouteHealthReconciliationReport, validateRouteHealthReconciliationReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "Route health reconciliation",
  "route-health-reconciliation.generated.json",
  "route-health-reconciliation.md",
  buildRouteHealthReconciliationReport(),
  validateRouteHealthReconciliationReport,
);
