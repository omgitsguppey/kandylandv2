import {
  buildUserManagementStatusTruthReport,
  validateUserManagementStatusTruthReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "User management status truth",
  statePath: "agent/state/user-management-status-truth.generated.json",
  docPath: "docs/agent-truth/user-management-status-truth.md",
  build: buildUserManagementStatusTruthReport,
  validate: validateUserManagementStatusTruthReport,
});

