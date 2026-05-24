import { assertBatch17, buildRouteRuntimeDisplayValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch17-shared";

const REPORT_PATH = "agent/state/route-runtime-display-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/route-runtime-display-cleanup.md";

export function validateRouteRuntimeDisplayCleanup() {
  const report = buildRouteRuntimeDisplayValidationReport();
  const failures: string[] = [];
  assertBatch17(report.display.liveContradictionCount === 0, "stale/unseen/warn/fail submetrics still show LIVE badges.", failures);
  assertBatch17(report.display.exactFailRoutes.length === report.rollup.currentFailCount, "fail=1 does not list exact route.", failures);
  assertBatch17(report.rollup.currentSlowRouteCount < report.rollup.slowSampleCount, "slow samples are treated as active warning count.", failures);
  assertBatch17(report.rollup.warningGroupCount > 0 && report.rollup.warningGroupCount < report.rollup.rawWarningCount, "warn samples are ungrouped.", failures);
  assertBatch17(report.rollup.currentFailCount < report.rollup.currentFailCount + report.rollup.unseenCount, "unseen route count collapsed into current failures.", failures);
  assertBatch17(report.rollup.staleFailCount >= 0, "stale routes are counted as current failures.", failures);
  assertBatch17(report.rollup.cohorts.chat_native.narrativeContradictionCount === 0 && report.rollup.cohorts.chat_compat.narrativeContradictionCount === 0, "native/compat chat contradictions remain.", failures);
  if (failures.length > 0) throw new Error(`Route runtime display cleanup validation failed:\n- ${failures.join("\n- ")}`);

  report.validationFailures = failures;
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Route Runtime Display Cleanup",
    "",
    "Status: route runtime display separates current failures, stale samples, unseen routes, warning groups, and slow sample history.",
    `- Current failures: ${report.rollup.currentFailCount} (${report.display.exactFailRoutes.join(", ")})`,
    `- Stale routes: ${report.rollup.staleCount}`,
    `- Unseen routes: ${report.rollup.unseenCount}`,
    `- Warnings: ${report.rollup.rawWarningCount} samples -> ${report.rollup.warningGroupCount} groups`,
    `- Slow: ${report.rollup.slowSampleCount} samples -> ${report.rollup.currentSlowRouteCount} current slow routes`,
  ]);
  return report;
}

if (require.main === module) {
  const report = validateRouteRuntimeDisplayCleanup();
  console.log(`Route runtime display cleanup passed: fail=${report.rollup.currentFailCount}, groups=${report.rollup.warningGroupCount}.`);
}
