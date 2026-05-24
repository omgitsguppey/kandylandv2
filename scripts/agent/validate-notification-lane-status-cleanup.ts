import {
  buildNotificationLaneStatusCleanupReport,
  validateNotificationLaneStatusCleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Notification lane status cleanup",
  statePath: "agent/state/notification-lane-status-cleanup.generated.json",
  docPath: "docs/agent-truth/notification-lane-status-cleanup.md",
  build: buildNotificationLaneStatusCleanupReport,
  validate: validateNotificationLaneStatusCleanupReport,
});

