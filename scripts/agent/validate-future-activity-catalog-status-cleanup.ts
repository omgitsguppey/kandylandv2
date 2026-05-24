import {
  buildFutureActivityCatalogStatusCleanupReport,
  validateFutureActivityCatalogStatusCleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Future activity catalog status cleanup",
  statePath: "agent/state/future-activity-catalog-status-cleanup.generated.json",
  docPath: "docs/agent-truth/future-activity-catalog-status-cleanup.md",
  build: buildFutureActivityCatalogStatusCleanupReport,
  validate: validateFutureActivityCatalogStatusCleanupReport,
});

