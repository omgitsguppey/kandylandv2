import {
  buildAuthLaneStatusCleanupReport,
  validateAuthLaneStatusCleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Auth lane status cleanup",
  statePath: "agent/state/auth-lane-status-cleanup.generated.json",
  docPath: "docs/agent-truth/auth-lane-status-cleanup.md",
  build: buildAuthLaneStatusCleanupReport,
  validate: validateAuthLaneStatusCleanupReport,
});

