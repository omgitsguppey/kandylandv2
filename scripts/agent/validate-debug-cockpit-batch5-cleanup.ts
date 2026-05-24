import {
  buildDebugCockpitBatch5CleanupReport,
  validateDebugCockpitBatch5CleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Debug cockpit batch5 cleanup",
  statePath: "agent/state/debug-cockpit-batch5-cleanup.generated.json",
  docPath: "docs/agent-truth/debug-cockpit-batch5-cleanup.md",
  build: buildDebugCockpitBatch5CleanupReport,
  validate: validateDebugCockpitBatch5CleanupReport,
});

