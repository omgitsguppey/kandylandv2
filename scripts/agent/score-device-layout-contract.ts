import {
  buildDeviceLayoutScoreReport,
  printDeviceLayoutScoreSummary,
  writeDeviceLayoutScoreReport,
} from "../../src/lib/device-layout-score";

export function runDeviceLayoutScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const report = buildDeviceLayoutScoreReport({ root, safeAutofixesApplied });
  writeDeviceLayoutScoreReport(report, root);
  return report;
}

const report = runDeviceLayoutScore();
printDeviceLayoutScoreSummary(report);
