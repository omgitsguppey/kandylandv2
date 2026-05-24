import {
  buildAdminSummaryLaneStatusClassifierReport,
  validateAdminSummaryLaneStatusClassifierReport,
  writeAndValidateReport,
} from "./admin-status-lane-cleanup-shared";

writeAndValidateReport({
  title: "Admin summary lane status classifier",
  statePath: "agent/state/admin-summary-lane-status-classifier.generated.json",
  docPath: "docs/agent-truth/admin-summary-lane-status-classifier.md",
  build: buildAdminSummaryLaneStatusClassifierReport,
  validate: validateAdminSummaryLaneStatusClassifierReport,
});

