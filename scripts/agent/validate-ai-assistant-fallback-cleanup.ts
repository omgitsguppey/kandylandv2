import { buildAiAssistantFallbackCleanupReport, validateAiAssistantFallbackCleanupReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "AI assistant fallback cleanup",
  "ai-assistant-fallback-cleanup.generated.json",
  "ai-assistant-fallback-cleanup.md",
  buildAiAssistantFallbackCleanupReport(),
  validateAiAssistantFallbackCleanupReport,
);
