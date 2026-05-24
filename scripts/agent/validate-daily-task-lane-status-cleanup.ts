import {
  buildDailyTaskLaneStatusCleanupReport,
  validateDailyTaskLaneStatusCleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Daily task lane status cleanup",
  statePath: "agent/state/daily-task-lane-status-cleanup.generated.json",
  docPath: "docs/agent-truth/daily-task-lane-status-cleanup.md",
  build: buildDailyTaskLaneStatusCleanupReport,
  validate: validateDailyTaskLaneStatusCleanupReport,
});

