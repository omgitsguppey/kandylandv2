import {
  buildChatGatingStatusCleanupReport,
  validateChatGatingStatusCleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Chat gating status cleanup",
  statePath: "agent/state/chat-gating-status-cleanup.generated.json",
  docPath: "docs/agent-truth/chat-gating-status-cleanup.md",
  build: buildChatGatingStatusCleanupReport,
  validate: validateChatGatingStatusCleanupReport,
});

