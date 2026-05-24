import {
  buildOpenBacklogStatusCleanupReport,
  validateOpenBacklogStatusCleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Open backlog status cleanup",
  statePath: "agent/state/open-backlog-status-cleanup.generated.json",
  docPath: "docs/agent-truth/open-backlog-status-cleanup.md",
  build: buildOpenBacklogStatusCleanupReport,
  validate: validateOpenBacklogStatusCleanupReport,
});

