import { buildTaskUserCreatorIntakeStatusCleanupReport, validateTaskUserCreatorIntakeStatusCleanupReport, writeAndValidateReport } from "./ops-health-cleanup-shared";

writeAndValidateReport(
  "Task user creator intake status cleanup",
  "task-user-creator-intake-status-cleanup.generated.json",
  "task-user-creator-intake-status-cleanup.md",
  buildTaskUserCreatorIntakeStatusCleanupReport(),
  validateTaskUserCreatorIntakeStatusCleanupReport,
);
