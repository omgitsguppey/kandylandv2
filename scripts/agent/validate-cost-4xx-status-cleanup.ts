import {
  buildCost4xxStatusCleanupReport,
  validateCost4xxStatusCleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Cost 4xx status cleanup",
  statePath: "agent/state/cost-4xx-status-cleanup.generated.json",
  docPath: "docs/agent-truth/cost-4xx-status-cleanup.md",
  build: buildCost4xxStatusCleanupReport,
  validate: validateCost4xxStatusCleanupReport,
});

