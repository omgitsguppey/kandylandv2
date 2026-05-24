import {
  buildTestingCoverageStatusCleanupReport,
  validateTestingCoverageStatusCleanupReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Testing coverage status cleanup",
  statePath: "agent/state/testing-coverage-status-cleanup.generated.json",
  docPath: "docs/agent-truth/testing-coverage-status-cleanup.md",
  build: buildTestingCoverageStatusCleanupReport,
  validate: validateTestingCoverageStatusCleanupReport,
});

