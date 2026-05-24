import {
  buildDebugCockpitBatch4CleanupReport,
  validateDebugCockpitBatch4CleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Debug cockpit batch4 cleanup",
  statePath: "agent/state/debug-cockpit-batch4-cleanup.generated.json",
  docPath: "docs/agent-truth/debug-cockpit-batch4-cleanup.md",
  build: buildDebugCockpitBatch4CleanupReport,
  validate: validateDebugCockpitBatch4CleanupReport,
});

