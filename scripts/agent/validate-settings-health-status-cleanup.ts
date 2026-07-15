import {
  buildSettingsHealthStatusCleanupReport,
  validateSettingsHealthStatusCleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Settings health status cleanup",
  statePath: "agent/state/settings-health-status-cleanup.generated.json",
  docPath: "docs/agent-truth/settings-health-status-cleanup.md",
  build: buildSettingsHealthStatusCleanupReport,
  validate: validateSettingsHealthStatusCleanupReport,
  archiveOnly: true,
});
