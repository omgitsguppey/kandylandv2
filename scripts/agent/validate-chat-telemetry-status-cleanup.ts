import {
  buildChatTelemetryStatusCleanupReport,
  validateChatTelemetryStatusCleanupReport,
  writeAndValidateReport,
} from "./chat-cost-status-cleanup-shared";

writeAndValidateReport({
  title: "Chat telemetry status cleanup",
  statePath: "agent/state/chat-telemetry-status-cleanup.generated.json",
  docPath: "docs/agent-truth/chat-telemetry-status-cleanup.md",
  build: buildChatTelemetryStatusCleanupReport,
  validate: validateChatTelemetryStatusCleanupReport,
});

